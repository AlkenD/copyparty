import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Navbar from '@/components/ui/cp-navbar'
import { ThemeProvider } from '@/components/shadcn/theme-provider'
import { SidebarInset, SidebarProvider } from '@/components/shadcn/sidebar'
import CpSidebar from '@/components/ui/cp-sidebar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/shadcn/resizable'
import * as React from 'react'

export const Route = createRootRoute({
  component: () => {
    const [sidebarPct, setSidebarPct] = React.useState<number>(22)

    return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-svh flex-col">
        <SidebarProvider
          className="flex h-full flex-col"
          style={{ ['--sidebar-width' as any]: `${sidebarPct}%` }}
        >
          <Navbar />
          <ResizablePanelGroup direction="horizontal" className="flex flex-1 min-h-0 p-4 pt-0">
            <ResizablePanel
              defaultSize={22}
              minSize={12}
              maxSize={40}
              onResize={(size) => setSidebarPct(size)}
            >
              <CpSidebar style={{ ['--sidebar-width' as any]: `${sidebarPct}%` }} />
            </ResizablePanel>
            <ResizableHandle withHandle className="z-20" />
            <ResizablePanel minSize={40}>
              <SidebarInset>
                <main className="flex flex-1 flex-col gap-4 p-4">
                  <Outlet />
                  <TanStackRouterDevtools />
                </main>
              </SidebarInset>
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarProvider>
      </div>
    </ThemeProvider>
    )
  },
  notFoundComponent: () => (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-100">
          404 - Page Not Found
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="text-blue-200 underline hover:text-blue-200">
          Go back to home
        </a>
      </div>
    </div>
  ),
})
