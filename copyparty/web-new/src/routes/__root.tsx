import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Navbar from '@/components/ui/cp-navbar'
import { ThemeProvider } from '@/components/shadcn/theme-provider'
import { SidebarInset, SidebarProvider } from '@/components/shadcn/sidebar'
import CpSidebar from '@/components/ui/cp-sidebar'

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="[--header-height:calc(96px)]">
        <SidebarProvider className="flex flex-col">
          <Navbar />
          <div className="flex flex-1">
            <CpSidebar />
            <SidebarInset>
              <main className="flex flex-1 flex-col gap-4 p-4">
                <Outlet />
                <TanStackRouterDevtools />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          404 - Page Not Found
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="text-blue-600 underline hover:text-blue-800">
          Go back to home
        </a>
      </div>
    </div>
  ),
})
