import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase em falta. ' +
    'Copia o ficheiro .env.example para .env e preenche os valores.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
