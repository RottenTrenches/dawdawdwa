import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TopNav />
      <main className="pt-16 md:pt-16 pb-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};
