import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
    </ProtectedRoute>
  );
};

export default HomeLayout;
