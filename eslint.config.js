import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `dist` e build. O resto sao fora do ambito do lint da web: `mobile/` tem o
  // seu proprio `expo lint`, as edge functions sao codigo Deno verificadas pelo
  // `deno check` (que e o gate que apanha erros de tipo a serio), e
  // `.expo/types` e gerado pelo dev server. Sem isto o lint da raiz reportava
  // 140 erros em codigo que ninguem manda lintar por aqui.
  {
    ignores: [
      "dist",
      "mobile",
      "supabase",
      "**/.expo/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
