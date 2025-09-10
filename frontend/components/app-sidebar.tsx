"use client";
import * as React from "react";
import { LayoutDashboard, TrafficCone, Users } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import AppLogo from "@/public/app_logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  // Base nav items
  const baseNavItems = [
    {
      title: "Dashboard",
      url: "/home/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Traffic Management",
      url: "/home/traffic-management",
      icon: TrafficCone,
    },
  ];

  // Admin-only nav items
  const adminNavItems = [
    {
      title: "User Management",
      url: "/home/user-management",
      icon: Users,
    },
  ];

  // Filter nav items based on user role
  const navItems = user?.role === "admin" 
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  // Nav data
  const data = {
    user: {
      name: user?.username || "",
      email: user?.email || "",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: navItems,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mt-2"
        >
          <div className="flex flex-row gap-1 items-center">
            <Image src={AppLogo} alt="STMS logo" height={40} width={40} />
            <div className="flex flex-col">
              <h1 className="text-base">STMS</h1>
              <h1 className="text-xs">(Smart Traffic Mgmt. System)</h1>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} currentPath={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}