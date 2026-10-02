import fs from 'fs';
import path from 'path';

import { isValidUsername, normalizeUsername } from './usernameRules';

// Tabela única de veredictos, usada pelas DUAS implementações que têm de
// concordar: este módulo (mobile) e a edge function. Se a lista vivesse
// duplicada em cada bloco, os dois testes poderiam divergir na cobertura sem
// que nada falhasse — que é o modo exacto de falha que este ficheiro existe
// para apanhar.
const CASES: ReadonlyArray<readonly [string, boolean]> = [
  // normais
  ['joao', true],
  ['ana', true],
  ['joao.silva_1', true],
  ['a-b.c_d', true],

  // tamanho fora de 3..30
  ['ab', false],
  ['a'.repeat(31), false],

  // conjunto de caracteres
  ['Joao', false], // só passa depois de normalizado
  ['.joao', false],
  ['joao.', false],
  ['joao silva', false],
  ['joao@x', false],

  // wa + dígitos: reservado, geraria o email sintético de uma conta WhatsApp
  ['wa244821999999', false],
  ['wa123', false],

  // não exagerar: usernames que apenas começam por wa são legítimos
  ['water', true],
  ['wa', false], // curto demais, não pela reserva
];

describe('normalizeUsername', () => {
  it('normaliza para minúsculas e sem espaços nas pontas', () => {
    // A validação tem de correr DEPOIS disto, senão "Joao" é recusado no
    // cliente e aceite no servidor, que normaliza antes de validar.
    expect(normalizeUsername('  Joao  ')).toBe('joao');
  });

  it('não rebenta com null/undefined', () => {
    expect(normalizeUsername(null)).toBe('');
    expect(normalizeUsername(undefined)).toBe('');
  });
});

describe('isValidUsername', () => {
  it('aceita usernames normais', () => {
    expect(isValidUsername('joao')).toBe(true);
    expect(isValidUsername('joao.silva_1')).toBe(true);
    expect(isValidUsername('a-b.c_d')).toBe(true);
  });

  it('recusa fora de 3..30 caracteres', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a'.repeat(31))).toBe(false);
    expect(isValidUsername('a'.repeat(30))).toBe(true);
  });

  it('recusa maiúsculas e pontuação nas pontas', () => {
    expect(isValidUsername('Joao')).toBe(false);
    expect(isValidUsername('.joao')).toBe(false);
    expect(isValidUsername('joao.')).toBe(false);
    expect(isValidUsername('joao silva')).toBe(false);
  });

  it('recusa wa seguido de dígitos, reservado ao WhatsApp', () => {
    // 'wa244821999999' geraria o email sintético wa244821999999@tmt.local,
    // que é o email de uma conta de WhatsApp real.
    expect(isValidUsername('wa244821999999')).toBe(false);
    expect(isValidUsername('wa123')).toBe(false);
  });

  it('não recusa usernames que apenas começam por wa', () => {
    expect(isValidUsername('water')).toBe(true);
    expect(isValidUsername('wa')).toBe(false); // curto demais, não pela reserva
  });
});

describe('o CHECK na base de dados segue a mesma regra', () => {
  // A regra do username vive em quatro sítios: este módulo, o diálogo web, a
  // edge function e o CHECK. Só este último é garantido pelo Postgres, e é
  // também o único que não se deixa testar a exercitar a app. Já divergiu uma
  // vez: o CHECK aceitava 'wa'+dígitos enquanto as três cópias de código
  // recusavam. Se o CHECK divergir de novo, este teste falha.
  const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');

  function effectiveUsernameCheck(): string {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const sql = files
      .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
      .join('\n');

    const marker = 'add constraint user_profiles_username_format';
    const at = sql.lastIndexOf(marker);
    if (at === -1) {
      throw new Error('user_profiles_username_format não encontrada em nenhuma migration');
    }
    // A última definição é a que fica em vigor: a constraint é largada e
    // recriada por migrations posteriores.
    const from = sql.indexOf('check', at);
    const to = sql.indexOf(');', from);
    return sql.slice(from, to + 2).replace(/\s+/g, ' ');
  }

  const flat = effectiveUsernameCheck();

  it('recusa wa seguido de dígitos, como o código', () => {
    expect(flat).toContain("username !~ '^wa[0-9]+$'");
  });

  it('mantém os mesmos limites de tamanho', () => {
    expect(flat).toContain('char_length(username) between 3 and 30');
  });

  it('mantém o mesmo conjunto de caracteres', () => {
    expect(flat).toContain("username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'");
  });
});

describe('a edge function aplica a mesma regra', () => {
  // A edge function é a cópia desta regra que corre em produção, e vive fora
  // do alcance do jest: importa de jsr e de deno.land, e o jest não resolve
  // nenhum dos dois. Em vez de comparar texto — o que só prova que a string
  // está presente — extrai-se a função do ficheiro e corre-se a mesma tabela.
  const edgePath = path.join(
    __dirname,
    '..',
    '..',
    'supabase',
    'functions',
    'username-auth',
    'index.ts',
  );
  const source = fs.readFileSync(edgePath, 'utf8');

  function loadEdgeValidator(): (value: string) => boolean {
    const match = source.match(
      /function isValidUsername\([^)]*\)\s*:\s*boolean\s*\{([\s\S]*?)\n\}/,
    );
    if (!match) {
      throw new Error(
        'isValidUsername não encontrada em username-auth/index.ts. A edge function ' +
          'foi refeita e este teste tem de a seguir, senão deixa de testar nada.',
      );
    }
    return new Function('value', match[1]) as (value: string) => boolean;
  }

  const edgeIsValid = loadEdgeValidator();

  it.each(CASES)('%s -> %s', (value, expected) => {
    expect(edgeIsValid(value)).toBe(expected);
  });
});
