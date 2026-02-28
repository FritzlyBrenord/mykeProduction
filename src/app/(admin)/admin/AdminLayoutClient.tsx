"use client";

import { ThemeProvider } from "next-themes";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useMemo } from "react";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminSidebar />

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-80"
        }`}
      >
        {/* Mobile spacing for header */}
        <div className="h-16 lg:hidden" />

        <div className="p-4 lg:p-8">{children}</div>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          },
        }}
      />
    </div>
  );
}

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SidebarProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
