import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  noFooter?: boolean;
}

export function Layout({ children, noFooter = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mt-20">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
