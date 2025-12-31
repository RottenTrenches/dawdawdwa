import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type NavLayout = "top" | "side";

interface NavLayoutContextType {
  layout: NavLayout;
  toggleLayout: () => void;
}

const NavLayoutContext = createContext<NavLayoutContextType | undefined>(undefined);

export const NavLayoutProvider = ({ children }: { children: ReactNode }) => {
  const [layout, setLayout] = useState<NavLayout>(() => {
    const stored = localStorage.getItem("nav-layout");
    return (stored === "side" ? "side" : "top") as NavLayout;
  });

  useEffect(() => {
    localStorage.setItem("nav-layout", layout);
  }, [layout]);

  const toggleLayout = () => {
    setLayout((prev) => (prev === "top" ? "side" : "top"));
  };

  return (
    <NavLayoutContext.Provider value={{ layout, toggleLayout }}>
      {children}
    </NavLayoutContext.Provider>
  );
};

export const useNavLayout = () => {
  const context = useContext(NavLayoutContext);
  if (!context) {
    throw new Error("useNavLayout must be used within NavLayoutProvider");
  }
  return context;
};
