import { Calendar, ChevronLeft, ChevronRight, FileText, Home, Hourglass, LogOut, Menu, Moon, Settings, Share2, Sun, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMatchRoute, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { RootState } from '@/store'
import { logout } from '@/store/authSlice'
import { authApi } from '@/api/authApi'
import { getPublicUrl } from '@/api/mediaApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/ThemeProvider'
import CalendarView from '@/components/CalendarView'
import { NotificationBell } from '@/components/NotificationBell'

interface LayoutProps {
  children: ReactNode | ((selectedDate: Date | null) => ReactNode)
}

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/all-posts', icon: FileText, label: 'All Posts' },
  { to: '/my-people', icon: Users, label: 'My people' },
  { to: '/my-timeline', icon: Hourglass, label: 'My timeline' },
  { to: '/co-posts', icon: Share2, label: 'Co-Posts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme()
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authApi.logout()
      dispatch(logout())
      navigate({ to: '/login' })
    } catch (error) {
      console.error('Logout error:', error)
      dispatch(logout())
      navigate({ to: '/login' })
    }
  }

  const isActiveRoute = (path: string) => matchRoute({ to: path, fuzzy: false })

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ?? null)
  }

  const handleNavigation = (to: string) => {
    navigate({ to })
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Top Navbar */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shrink-0">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <button
            className="text-xl font-bold hover:opacity-80 transition-opacity"
            onClick={() => navigate({ to: '/' })}
          >
            Innerloop
          </button>
        </div>

        {/* Right side: Notification + Theme Toggle + Profile Menu */}
        <div className="flex items-center gap-2 md:gap-3">
          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={user?.profilePicture ? getPublicUrl(user.profilePicture) : user?.avatar} alt="Profile" />
                <AvatarFallback>
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: '/profile' })}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: '/settings' })}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar — desktop only */}
        <aside className={`border-r bg-background transition-all duration-300 hidden md:flex flex-col ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          {/* Chevron collapse button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`absolute transition-all duration-300 top-4 bg-background border rounded-full
                ${isSidebarCollapsed ? 'left-[46px]' : 'left-[238px]'}
              `}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex-1 overflow-auto py-4">
            <div className="space-y-1 px-2">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <Button
                  key={to}
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${
                    isSidebarCollapsed ? 'px-0 justify-center' : ''
                  } ${isActiveRoute(to) ? 'bg-accent' : ''}`}
                  onClick={() => navigate({ to })}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isSidebarCollapsed && <span>{label}</span>}
                </Button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Mobile sidebar drawer */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg z-50 md:hidden animate-in slide-in-from-left duration-300 flex flex-col">
              <div className="flex items-center justify-between border-b px-4 py-4">
                <span className="text-lg font-bold">Innerloop</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="flex-1 overflow-auto py-4">
                <div className="space-y-1 px-2">
                  {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Button
                      key={to}
                      variant="ghost"
                      className={`w-full justify-start gap-3 ${isActiveRoute(to) ? 'bg-accent' : ''}`}
                      onClick={() => handleNavigation(to)}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </nav>
            </div>
          </>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {typeof children === 'function' ? children(selectedDate) : children}
        </main>

        {/* Right Sliding Calendar Panel - Dashboard only */}
        {isActiveRoute('/') && isCalendarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-background border-l shadow-lg z-50 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-semibold">Select Date</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCalendarOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CalendarView onDateSelect={handleDateSelect} />
            </div>
          </>
        )}

        {/* Floating Calendar Button - Dashboard only */}
        {isActiveRoute('/') && (
          <Button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30 hover:scale-110 transition-transform"
          >
            <Calendar className="h-6 w-6" />
            <span className="sr-only">Toggle calendar</span>
          </Button>
        )}
      </div>
    </div>
  )
}
