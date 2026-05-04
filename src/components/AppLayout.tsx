import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { SuspensionBanner } from "./SuspensionBanner";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-4 md:px-8 py-6 animate-fade-in">
            <SuspensionBanner />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
