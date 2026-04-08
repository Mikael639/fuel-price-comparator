import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />
      <AppHeader />
      <main className="relative z-10">{children}</main>
    </div>
  );
};
