import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extrai uma mensagem legivel de um erro desconhecido.
 *
 * `catch (e: unknown)` nao garante nada sobre a forma de `e`, e os admin tabs
 * repetem `e instanceof Error ? e.message : ...` para mostrar o erro ao
 * utilizador. Este helper evita esse repeticao e garante sempre uma `string`.
 */
export function getErrorMessage(error: unknown, fallback = "Erro desconhecido"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
