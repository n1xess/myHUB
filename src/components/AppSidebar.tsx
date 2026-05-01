import { BarChart3, Briefcase, ChevronDown, Search } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const topLevelItems = [
  { title: "Screener", url: "/screener", icon: Search },
  { title: "Portfolio", url: "/portfolio", icon: Briefcase },
];

export function AppSidebar() {
  const location = useLocation();
  const isAnalyticsOpen =
    location.pathname === "/" ||
    location.pathname.startsWith("/analytics/");

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-4">
        <span className="font-heading text-lg font-bold text-primary">FLOW</span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Collapsible defaultOpen={isAnalyticsOpen} className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isAnalyticsOpen} className="justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Analytics</span>
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/" || location.pathname === "/analytics/total"}>
                          <NavLink to="/analytics/total" end activeClassName="bg-sidebar-accent text-primary font-medium">
                            <span>Total Analytics</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/analytics/tables"}>
                          <NavLink to="/analytics/tables" end activeClassName="bg-sidebar-accent text-primary font-medium">
                            <span>Analytics Table</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {topLevelItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
