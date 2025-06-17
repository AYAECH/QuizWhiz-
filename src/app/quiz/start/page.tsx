
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlayCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { GeneratedQuiz } from '@/types'; 

const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data'; 
const QUIZ_SESSION_KEY = 'quizwhiz_current_quiz_session_data'; 

export default function QuizStartPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);
  const [activeQuizExistsOnLoad, setActiveQuizExistsOnLoad] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      setActiveQuizExistsOnLoad(!!localStorage.getItem(ACTIVE_QUIZ_DATA_KEY));
    }
  }, []);

  const handleStartQuiz = async () => {
    if (!user) {
      toast({ title: 'Authentification Requise', description: 'Veuillez vous inscrire ou vous connecter pour commencer un quiz.', variant: 'destructive' });
      router.push('/register');
      return;
    }

    const activeQuizJson = localStorage.getItem(ACTIVE_QUIZ_DATA_KEY);
    if (!activeQuizJson) {
      toast({ title: 'Aucun Quiz Disponible', description: 'Un administrateur doit d\'abord télécharger un document et générer un quiz.', variant: 'destructive' });
      setActiveQuizExistsOnLoad(false); 
      router.push('/admin/upload'); 
      return;
    }

    setIsPreparingQuiz(true);
    try {
      const quizDataFromStorage = JSON.parse(activeQuizJson) as GeneratedQuiz; 
      
      if (quizDataFromStorage && quizDataFromStorage.quiz && quizDataFromStorage.quiz.length > 0) {
        localStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(quizDataFromStorage));
        toast({ title: 'Quiz Prêt !', description: `Votre quiz de ${quizDataFromStorage.quiz.length} questions est prêt.` });
        router.push('/quiz/play');
      } else {
        throw new Error('Les données du quiz stockées sont invalides ou vides.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du quiz pré-généré:', error);
      toast({
        title: 'Échec du Démarrage du Quiz',
        description: (error instanceof Error ? error.message : String(error)) || 'Impossible de charger le quiz pré-généré. Il pourrait être corrompu ou manquant.',
        variant: 'destructive',
      });
      setIsPreparingQuiz(false);
    }
  };
  
  if (!isClient || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <CardTitle>Connexion Requise</CardTitle>
          <CardDescription>Vous devez être connecté pour commencer un quiz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/register">S'inscrire ou Se Connecter</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!activeQuizExistsOnLoad) { 
     return (
      <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <CardTitle>Aucun Quiz Disponible</CardTitle>
          <CardDescription>Aucun quiz n'a encore été généré par un administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Veuillez demander à un administrateur de télécharger un document et de générer un quiz.</p>
          <Button asChild variant="secondary">
            <Link href="/admin/upload">Page de Téléchargement Admin</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
      <Card className="w-full max-w-lg shadow-xl p-8">
         <PlayCircle className="h-20 w-20 text-primary mx-auto mb-6" />
        <h1 className="text-4xl font-headline font-bold text-primary mb-4">Prêt à Commencer ?</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Le quiz est prêt et basé sur le dernier document téléchargé par un administrateur.
        </p>
        <Button onClick={handleStartQuiz} disabled={isPreparingQuiz} size="lg" className="w-full max-w-xs mx-auto">
          {isPreparingQuiz ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Préparation du Quiz...
            </>
          ) : (
            'Commencer le Quiz Maintenant'
          )}
        </Button>
        {isPreparingQuiz && (
          <p className="text-sm text-muted-foreground mt-4">Veuillez patienter, nous chargeons vos questions...</p>
        )}

        <Card className="mt-8 bg-blue-50 border-blue-400 text-blue-700">
          <CardContent className="p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">Note :</p>
              <p className="text-xs">
                Ce quiz est basé sur le(s) dernier(s) document(s) téléchargé(s) et traité(s) par un administrateur.
                Les questions sont sélectionnées lors de cette étape de traitement.
              </p>
            </div>
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}
