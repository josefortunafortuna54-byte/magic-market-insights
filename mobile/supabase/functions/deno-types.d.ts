// Ambiente de tipos para as Supabase Edge Functions (Deno) — usado apenas pelo
// TypeScript LSP. Em runtime (Deno/Supabase) estes tipos vêm de lib.deno.d.ts.

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'jsr:@supabase/supabase-js@2' {
  export interface SupabaseClient {
    [key: string]: any;
    auth: any;
    from(table: string): any;
  }
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>,
  ): SupabaseClient;
}
