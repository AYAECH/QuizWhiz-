
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpenCheck, Lightbulb } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useEffect, useState } from 'react';

const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data';

export default function HomePage() {
  const { user } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [quizAvailable, setQuizAvailable] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const activeQuizData = localStorage.getItem(ACTIVE_QUIZ_DATA_KEY);
      setQuizAvailable(!!activeQuizData);
    }
  }, []);

  const canStartQuiz = user && quizAvailable;
  const canViewFlashInfo = user && quizAvailable; 

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-headline font-bold text-primary">Bienvenue sur QuizWhiz!</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Votre plateforme interactive pour l'apprentissage et l'évaluation. Téléchargez des documents, générez des quiz et testez vos connaissances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <BookOpenCheck className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Commencer un Quiz</CardTitle>
            <CardDescription>Prêt à tester vos connaissances ? Lancez une nouvelle session de quiz.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isClient ? (
               <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : !user ? (
              <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link> pour commencer un quiz.</p>
            ) : !quizAvailable ? (
              <p className="text-sm text-destructive">Un administrateur doit d'abord <Link href="/admin/upload" className="underline hover:text-destructive/80">télécharger un document et générer un quiz</Link>.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Un quiz est disponible. Bonne chance !</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" disabled={!isClient || !canStartQuiz}>
              <Link href="/quiz/start">
                Commencer un nouveau Quiz <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Lightbulb className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Informations Flash</CardTitle>
            <CardDescription>Accédez à des aperçus rapides et des faits clés issus des documents téléchargés.</CardDescription>
          </CardHeader>
           <CardContent>
             {!isClient ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : !user ? (
                <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link> pour voir les informations flash.</p>
              ) : !quizAvailable ? (
                <p className="text-sm text-destructive">Les informations flash seront disponibles après qu'un administrateur aura <Link href="/admin/upload" className="underline hover:text-destructive/80">téléchargé un document et généré du contenu</Link>.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Découvrez les informations clés du matériel source.</p>
              )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full" disabled={!isClient || !canViewFlashInfo}>
              <Link href="/flash-info">
                Voir les Infos Flash <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
