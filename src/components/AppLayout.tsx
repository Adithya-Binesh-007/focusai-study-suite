import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useStreakTracker } from "@/hooks/useStreakTracker";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Brain, LayoutDashboard, MessageSquare, ListTodo, Coins, BarChart3, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Assistant", url: "/assistant", icon: MessageSquare },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Credits", url: "/credits", icon: Coins },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex h-full flex-col">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="pointer-events-none">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md gradient-primary">
                    <Brain className="h-3 w-3 text-primary-foreground" />
                  </div>
                  {!collapsed && <span className="text-lg font-bold">FocusAI</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto space-y-2 p-4">
          <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={toggleTheme} className="w-full justify-start">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span className="ml-2">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </Button>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={signOut}
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  useStreakTracker();

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <AppSidebarContent />
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center border-b border-border px-2">
            <SidebarTrigger />
          </header>
          <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
