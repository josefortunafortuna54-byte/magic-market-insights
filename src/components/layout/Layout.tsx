import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  noFooter?: boolean;
  title?: string;
}

export function Layout({ children, noFooter = false, title }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mt-20">
        {title && (
          <div className="border-b border-border bg-card">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
      {!noFooter && <Footer />}
    </div>
  );
}
