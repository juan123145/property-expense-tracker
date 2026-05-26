import { createContext, useContext, ReactNode } from "react";

type SidebarContextType = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}
