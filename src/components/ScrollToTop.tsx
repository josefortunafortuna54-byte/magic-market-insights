import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Repoe a pagina no topo sempre que a rota muda.
 *
 * O BrowserRouter navega com pushState e nao reinicia o scroll, por isso o
 * offset da pagina anterior sobrevive a navegacao. Como o offset e maior do
 * que o novo conteudo permite, o browser limita-o ao maximo scrollavel e a
 * pagina seguinte abre ja no rodape.
 *
 * `useLayoutEffect` corre depois do DOM mudar mas antes do browser pintar,
 * o que evita o salto visivel de um frame no scroll antigo.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // o browser restaura o scroll em back/forward por conta propria e
  // entraria em conflito com o reset acima; pomos o gesto sob controlo da app
  useLayoutEffect(() => {
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
