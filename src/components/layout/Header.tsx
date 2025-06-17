'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, UserPlus, UploadCloud, Bell, LogIn, UserCircle } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user, logoutUser } = useUser();

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase() || "";
    return (names[0][0] + (names[names.length - 1][0] || "")).toUpperCase();
  }

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" legacyBehavior passHref>
          <a className="text-2xl font-headline font-bold hover:opacity-80 transition-opacity">
            QuizWhiz
          </a>
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
            <Link href="/" aria-label="Home">
              <Home className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
            <Link href="/admin/upload" aria-label="Upload PDF">
              <UploadCloud className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Admin Upload</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
            <Link href="/notifications" aria-label="Notifications">
              <Bell className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Notifications</span>
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-primary/80">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logoutUser} className="cursor-pointer">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
              <Link href="/register" aria-label="Register or Login">
                <LogIn className="h-5 w-5 sm:mr-1" />
                 <span className="hidden sm:inline">Register</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
