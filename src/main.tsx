import { createRoot } from "react-dom/client";
import { initI18n } from "@/lib/i18n";
import App from "./App.tsx";
import "./index.css";

initI18n();

// Apply persisted theme from our tmt_theme key on startup.
// next-themes defaults to the "theme" storage key; seed it from tmt_theme if present.
try {
  const storedTheme = localStorage.getItem("tmt_theme");
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    const ntKey = localStorage.getItem("theme");
    if (ntKey === null) localStorage.setItem("theme", storedTheme);
  }
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(<App />);
