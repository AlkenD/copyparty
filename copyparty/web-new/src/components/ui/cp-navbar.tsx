import { useTheme } from '@/components/shadcn/theme-provider'
import { Button } from '../shadcn/button'
import { MoonIcon, SettingsIcon, SidebarIcon, SunIcon } from 'lucide-react'
import { useSidebar } from '../shadcn/sidebar'

const Navbar = () => {
  const { theme, setTheme } = useTheme()
  const { toggleSidebar } = useSidebar()

  const handleTheme = () => {
    if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return (
    <div className="p-4">
      <div className="bg-navbar text-navbar-foreground flex h-16 items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <Button size="icon" variant="outline" onClick={toggleSidebar}>
            <SidebarIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={handleTheme}>
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>
          <Button size="icon" variant="ghost">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Navbar
