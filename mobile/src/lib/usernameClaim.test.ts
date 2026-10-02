import fs from 'fs';
import path from 'path';

// Guarda de segurança do `claim`. Estas asserções leem o codigo-fonte em vez de
// exercitar a funcao porque o que se protege nao e um valor de retorno: e uma
// decisao de produto. O claim reserva um NomeUnico a quem ja entrou por outra via
// e NAO define senha, porque uma senha transformaria a conta Google numa conta
// com duas portas de entrada e a segunda entraria sem o segundo factor.
//
// Um teste que verifique o valor devolvido passaria mesmo depois de alguem
// juntar um updateUserById({ password }) ao caminho. Estes nao: falham na mesma
// edicao que introduz a regressao.
const EDGE = path.resolve(
  __dirname,
  '../../supabase/functions/username-auth/index.ts',
);
const source = fs.readFileSync(EDGE, 'utf8');

// Recorta o codigo do claim, e nao o handler inteiro: o handler le `password` do
// corpo para o login por NomeUnico, e essa leitura e correcta. O que nao pode
// existir e uma leitura de senha no caminho do claim.
const slice = (from: string, to: string): string => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  if (start < 0 || end < 0) {
    throw new Error(
      `Nao encontrei "${from}" ... "${to}" em username-auth/index.ts. ` +
        'O claim foi renomeado ou movido -- actualiza este teste.',
    );
  }
  return source.slice(start, end);
};

const claimFn = slice('async function claimUsername', 'serve(async (req)');
const claimBranch = slice("if (action === 'claim')", "return errorJson('Ação desconhecida.')");

describe('claim: nenhuma senha', () => {
  it('o caminho do claim nao escreve password', () => {
    expect(claimFn).not.toMatch(/password/i);
    expect(claimBranch).not.toMatch(/password/i);
  });

  it('o caminho do claim nao chama anything que toque em auth.users passwords', () => {
    for (const forbidden of ['updateUserById', 'createUser', 'encrypted_password']) {
      expect(claimFn).not.toContain(forbidden);
      expect(claimBranch).not.toContain(forbidden);
    }
  });
});

describe('claim: identidade vem do token', () => {
  it('valida o JWT do utilizador em vez de aceitar um user_id do corpo', () => {
    // Um parametro user_id no corpo permitiria a um atacante reservar um nome em
    // nome de outra pessoa. O id tem de vir do token que o proprio titular apresenta.
    expect(claimBranch).toContain('supabase.auth.getUser(jwt)');
    expect(claimBranch).not.toMatch(/body\.user_id|body\.userId/);
  });

  it('exige autenticacao antes de reservar', () => {
    expect(claimBranch).toMatch(/if \(!jwt\) return errorJson\(.+, 401\)/);
  });
});

describe('claim: o nome passa pela mesma validacao do login', () => {
  it('isValidUsername corre antes do ramo do claim, e nao dentro dele', () => {
    const validation = source.indexOf('if (!isValidUsername(username))');
    const claim = source.indexOf("if (action === 'claim')");
    expect(validation).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(-1);
    // A validacao tem de estar ANTES do ramo. Se passasse para dentro do `claim`,
    // um username invalido seria reservado a partir deste caminho.
    expect(validation).toBeLessThan(claim);
  });
});

describe('claim: um username so', () => {
  it('recusa reservar duas vezes, em vez de trocar o nome', () => {
    // Trocar de nome permitiria reescrever a autoria de mensagens antigas que ja
    // citavam o nome anterior.
    expect(claimFn).toMatch(/if \(profile\?\.username\) return \{ error: .+, status: 409 \}/);
  });

  it('um update que nao afeta linhas nao e sucesso', () => {
    // Sem o `select`, um update sem linhas afectadas devolvia ok e o username
    // nunca ficava reservado. `written` nulo tem de ser erro.
    expect(claimFn).toContain('.select(\'username\')');
    expect(claimFn).toMatch(/if \(!written\) return \{ error: .+, status: 500 \}/);
  });
});
