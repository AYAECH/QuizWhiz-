
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlayCircle, AlertTriangle, Info } from 'lucide-react'; // Changed icon
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
  const [activeQuizDetails, setActiveQuizDetails] = useState<{numQuestions: number; hasQuiz: boolean; sourceTitle?: string} | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const activeQuizJson = localStorage.getItem(ACTIVE_QUIZ_DATA_KEY);
      if (activeQuizJson) {
        try {
          const quizData = JSON.parse(activeQuizJson) as GeneratedQuiz;
          if (quizData && quizData.quiz && quizData.quiz.length > 0) {
            setActiveQuizDetails({ numQuestions: quizData.quiz.length, hasQuiz: true, sourceTitle: quizData.sourceTitle });
          } else {
            setActiveQuizDetails({ numQuestions: 0, hasQuiz: false, sourceTitle: quizData.sourceTitle });
          }
        } catch (e) {
          console.error("Erreur de chargement des données du quiz", e);
          setActiveQuizDetails({ numQuestions: 0, hasQuiz: false });
        }
      } else {
        setActiveQuizDetails({ numQuestions: 0, hasQuiz: false });
      }
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
      toast({ title: 'Aucun Quiz Disponible', description: 'Aucun quiz actif trouvé. Veuillez en générer un ou en sélectionner un depuis la bibliothèque.', variant: 'destructive' });
      setActiveQuizDetails({ numQuestions: 0, hasQuiz: false }); 
      router.push('/'); 
      return;
    }

    setIsPreparingQuiz(true);
    try {
      const quizDataFromStorage = JSON.parse(activeQuizJson) as GeneratedQuiz; 
      
      if (quizDataFromStorage && quizDataFromStorage.quiz && quizDataFromStorage.quiz.length > 0) {
        localStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(quizDataFromStorage)); 
        toast({ title: 'Quiz Prêt !', description: `Votre quiz de ${quizDataFromStorage.quiz.length} questions sur "${quizDataFromStorage.sourceTitle || 'le sujet sélectionné'}" est prêt.` });
        router.push('/quiz/play');
      } else {
        toast({ title: 'Quiz Invalide ou Vide', description: 'Les données du quiz actif sont invalides ou ne contiennent pas de questions.', variant: 'destructive' });
        setIsPreparingQuiz(false);
        setActiveQuizDetails({ numQuestions: 0, hasQuiz: false, sourceTitle: quizDataFromStorage?.sourceTitle }); 
      }
    } catch (error) {
      console.error('Erreur lors du chargement du quiz :', error);
      toast({
        title: 'Échec du Démarrage du Quiz',
        description: (error instanceof Error ? error.message : String(error)) || 'Impossible de charger le quiz.',
        variant: 'destructive',
      });
      setIsPreparingQuiz(false);
    }
  };
  
  if (!isClient || userLoading || activeQuizDetails === null) {
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

  if (!activeQuizDetails.hasQuiz) { 
     return (
      <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <CardTitle>Aucun Quiz Prêt à Démarrer</CardTitle>
          <CardDescription>
            {activeQuizDetails.sourceTitle ? `Le contenu "${activeQuizDetails.sourceTitle}" ne contient pas de questions de quiz.` : 'Aucun quiz avec des questions n\'a été trouvé dans les données actives.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Veuillez générer un quiz depuis la page d'accueil (culture générale) ou sélectionner un contenu PDF avec quiz depuis la <Link href="/pdf-library" className="underline hover:text-primary">bibliothèque PDF</Link>. Les administrateurs peuvent <Link href="/admin/upload" className="underline hover:text-primary">télécharger un document</Link>.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Retour à l'Accueil</Link>
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
         {activeQuizDetails.sourceTitle && <p className="text-xl text-muted-foreground mb-2">Sujet : <span className="font-semibold">{activeQuizDetails.sourceTitle}</span></p>}
        <p className="text-lg text-muted-foreground mb-8">
          Un quiz de {activeQuizDetails.numQuestions} questions est prêt à être lancé.
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
            <Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">Note :</p>
              <p className="text-xs">
                Ce quiz est basé sur les dernières données actives que vous avez sélectionnées ou générées.
              </p>
            </div>
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}
