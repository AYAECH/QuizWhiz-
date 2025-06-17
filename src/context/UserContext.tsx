'use client';

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { useToast } from '@/hooks/use-toast';

interface UserContextType {
  user: User | null;
  loginUser: (userData: { name: string; email: string }) => Promise<void>;
  logoutUser: () => void;
  isLoading: boolean; // For initial load from localStorage
  isLoggingIn: boolean; // For Supabase interaction during login
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'quizwhiz_user';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For localStorage loading
  const [isLoggingIn, setIsLoggingIn] = useState(false); // For Supabase operations
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
    }
    setIsLoading(false);
  }, []);

  const loginUser = async (userData: { name: string; email: string }) => {
    if (!supabase) {
      toast({ title: 'Erreur de Configuration', description: 'Supabase n\'est pas configuré. Veuillez contacter l\'administrateur.', variant: 'destructive' });
      // Fallback to localStorage only if Supabase is not available
      const localUser: User = { name: userData.name, email: userData.email }; // No ID
      setUser(localUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
      return;
    }

    setIsLoggingIn(true);
    try {
      // Upsert profile: inserts if email doesn't exist, updates name if email exists.
      // Requires 'email' to have a UNIQUE constraint in your 'profiles' table.
      const { data: profileData, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ email: userData.email, name: userData.name }, { onConflict: 'email', ignoreDuplicates: false })
        .select('id, name, email')
        .single();

      if (upsertError) {
        throw upsertError;
      }

      if (profileData) {
        const userToStore: User = {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
        };
        setUser(userToStore);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
        // Toast for successful login/registration is handled in RegistrationForm
      } else {
        toast({ title: 'Erreur de Profil', description: 'Impossible de créer ou de récupérer le profil utilisateur.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error("Failed to login/register user with Supabase", error);
      toast({
        title: 'Échec de la Connexion/Inscription',
        description: error.message || 'Une erreur est survenue lors de la communication avec la base de données.',
        variant: 'destructive',
      });
      // Optionally, clear localStorage if Supabase operation fails catastrophically
      // localStorage.removeItem(USER_STORAGE_KEY);
      // setUser(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logoutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      // If using Supabase Auth in the future, you would add:
      // await supabase.auth.signOut();
      toast({ title: 'Déconnecté', description: 'Vous avez été déconnecté avec succès.' });
    } catch (error) {
      console.error("Failed to remove user from localStorage", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser, isLoading, isLoggingIn }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
