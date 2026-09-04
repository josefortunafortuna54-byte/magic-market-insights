# RESUMO — The Magic Trader (Web → App Mobile)

Este diretório contém a documentação completa da aplicação web **The Magic Trader**
para servir de base à conversão em **app mobile**.

## Índice

| Ficheiro | Conteúdo |
|---|---|
| `01-VISAO-GERAL.md` | O que é a app, stack tecnológica, arquitetura e infraestrutura |
| `02-FUNCIONALIDADES.md` | Descrição detalhada de cada página e funcionalidade |
| `03-BACKEND-SUPABASE.md` | Base de dados, Edge Functions, autenticação, pagamentos e RLS |
| `04-MAPA-PARA-APP-MOBILE.md` | Mapa de conversão: ecrãs, APIs, push, recomendações técnicas |

## Resumo de 30 segundos

- **Produto:** Plataforma de sinais/análises de Forex gerados por IA (educacional).
- **Frente:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + framer-motion (web SPA).
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage) e Edge Functions (Deno).
- **Pagamentos:** Stripe (checkout por subscrição) — USD $29.99/mês ou 20.000 Kz/mês.
- **Idioma:** Português (PT-PT), fuso WAT (Angola).
- **Modelo de negócio:** Freemium — conta grátis com 3 pares / M15; Premium desbloqueia tudo.
