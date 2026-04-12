'use client'

import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function Header({ mobileNav }: { mobileNav?: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const t = useTranslations('auth')

  const handleLogout = () => {
    document.cookie = 'access_token=; path=/; max-age=0'
    clearAuth()
    router.push('/login')
  }

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U'

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
      <div className="flex items-center gap-4 md:hidden">
        {mobileNav ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex flex-col w-64 border-r">
               <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
               {mobileNav}
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
      <div className="hidden md:flex"></div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
