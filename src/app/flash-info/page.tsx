
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Lightbulb, AlertTriangle, Home, Info } from 'lucide-react';
import type { GeneratedQuiz } from '@/types';
import { useToast } from '@/hooks/use-toast';

const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data';

export default function FlashInfoPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [flashFacts, setFlashFacts] = useState<string[] | null | undefined>(undefined); 
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || userLoading) return;

    if (!user) {
      toast({ title: 'Authentification Requise', description: 'Veuillez vous connecter pour voir les informations flash.', variant: 'destructive' });
      router.push('/register');
      return;
    }

    const activeQuizJson = localStorage.getItem(ACTIVE_QUIZ_DATA_KEY);
    if (activeQuizJson) {
      try {
        const quizData = JSON.parse(activeQuizJson) as GeneratedQuiz;
        if (quizData && Array.isArray(quizData.flashFacts) && quizData.flashFacts.length > 0 && quizData.flashFacts.some(fact => fact.trim() !== "")) {
          setFlashFacts(quizData.flashFacts.filter(fact => fact.trim() !== ""));
        } else {
          setFlashFacts(null); // Explicitly set to null if no meaningful flash facts
        }
      } catch (error) {
        console.error('Erreur d\'analyse des données pour les infos flash:', error);
        toast({ title: 'Erreur de Chargement des Données', description: 'Impossible d\'analyser le contenu stocké.', variant: 'destructive' });
        setFlashFacts(null);
      }
    } else {
      setFlashFacts(null); // No active data found
      // Avoid toast here as user might have landed directly without content generated yet
    }
    setIsLoading(false);
  }, [isClient, user, userLoading, router, toast]);

  if (!isClient || isLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Chargement des Informations Flash...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
            <Lightbulb className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl">Informations Flash</CardTitle>
          <CardDescription>Aperçus rapides et faits clés (en français).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {flashFacts === undefined && ( // Still loading from localStorage effect
            <div className="flex justify-center items-center min-h-[100px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {flashFacts === null && ( // No flash facts available
            <Card className="bg-yellow-50 border-yellow-400 text-yellow-700">
              <CardContent className="p-4 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Aucune Information Flash Disponible</p>
                  <p className="text-xs">
                    Les informations flash n'ont peut-être pas été générées pour le sujet actuel ou aucun contenu n'a encore été traité.
                    Essayez de <Link href="/" className="underline hover:text-yellow-800">générer des informations flash</Link> depuis la page d'accueil.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {flashFacts && flashFacts.length > 0 && (
            <div className="space-y-3">
              {flashFacts.map((fact, index) => (
                <Card key={index} className="bg-primary/5 border-primary/20 shadow">
                   <CardContent className="p-3 flex items-start space-x-3">
                     <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                     <p className="text-sm text-primary">{fact}</p>
                   </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full" variant="outline">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Retour à l'Accueil
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
