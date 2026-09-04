-- Ativa pgcrypto (usado por crypt()/gen_salt() na seed do bot TMT)
create extension if not exists pgcrypto;
