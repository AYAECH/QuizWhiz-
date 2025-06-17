
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, UserPlus, UploadCloud, Bell, LogIn, UserCircle2, History } from 'lucide-react'; // Added UserCircle2, History
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
        <Link href="/" className="text-2xl font-headline font-bold hover:opacity-80 transition-opacity">
          QuizWhiz
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
            <Link href="/" aria-label="Accueil">
              <Home className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
            <Link href="/admin/upload" aria-label="Télécharger PDF">
              <UploadCloud className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Admin (PDF)</span>
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
                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png?size=36`} alt={user.name} />
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
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <History className="mr-2 h-4 w-4" />
                    Mon Profil / Historique
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logoutUser} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/80">
              <Link href="/register" aria-label="S'inscrire ou Se connecter">
                <LogIn className="h-5 w-5 sm:mr-1" />
                 <span className="hidden sm:inline">S'inscrire</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
