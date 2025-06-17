
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuizAttempt, FeedbackItem } from '@/types';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { provideEducationalFeedback } from '@/ai/flows/provide-educational-feedback';
import { CheckCircle, XCircle, MessageSquare, Loader2, Home, RotateCcw, HelpCircle, Save, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client

const QUIZ_ATTEMPT_RESULTS_KEY = 'quizwhiz_quiz_attempt_results';

export function QuizResultsClientPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [attemptData, setAttemptData] = useState<QuizAttempt | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast({ title: 'Non Connecté', description: 'Veuillez vous connecter pour voir les résultats.', variant: 'destructive'});
      router.push('/register');
      return;
    }

    const storedAttemptData = localStorage.getItem(QUIZ_ATTEMPT_RESULTS_KEY);
    if (storedAttemptData) {
      try {
        const parsedData = JSON.parse(storedAttemptData) as QuizAttempt;
        setAttemptData(parsedData);
      } catch (error) {
        console.error("Échec de l'analyse des données de la tentative", error);
        toast({ title: 'Erreur de Chargement des Résultats', description: 'Impossible de charger les résultats du quiz.', variant: 'destructive' });
        router.push('/'); 
        return;
      }
    } else {
      toast({ title: 'Aucun Résultat Trouvé', description: 'Résultats du quiz non trouvés.', variant: 'destructive' });
      router.push('/'); 
      return;
    }
    setIsLoading(false);
  }, [user, userLoading, router, toast]);

  // Effect to save score to Supabase once attemptData and user.id are available
  useEffect(() => {
    const saveScoreToSupabase = async () => {
      if (attemptData && user?.id && supabase) {
        setIsSavingScore(true);
        // Determine quiz title (simplified for now)
        let quizTitle = "Quiz"; 
        // Example: if (attemptData.quizDefinition.sourceType === 'PDF') quizTitle = "Quiz PDF";
        // else if (attemptData.quizDefinition.topic) quizTitle = `Culture Générale: ${attemptData.quizDefinition.topic}`;
        
        // For now, we don't have sourceType or topic in GeneratedQuiz consistently
        // We can add it later for more detailed titles.
        // A simple approach is to check if flashFacts has specific content or quiz has questions.
        if (attemptData.quizDefinition.quiz && attemptData.quizDefinition.quiz.length > 0){
            quizTitle = "Quiz de Culture Générale / PDF"; // Generic title
        } else if (attemptData.quizDefinition.flashFacts && attemptData.quizDefinition.flashFacts.length > 0) {
            quizTitle = "Informations Flash";
        }


        const { error } = await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          score: attemptData.score,
          total_questions: attemptData.totalQuestions,
          quiz_title: quizTitle 
        });

        if (error) {
          console.error('Error saving quiz attempt to Supabase:', error);
          toast({
            title: 'Erreur Sauvegarde Score',
            description: 'Votre score n\'a pas pu être sauvegardé en ligne.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Score Sauvegardé',
            description: 'Votre score a été sauvegardé avec succès en ligne.',
            className: 'bg-green-500 text-white',
          });
        }
        setIsSavingScore(false);
      }
    };

    if (attemptData && user?.id) {
       saveScoreToSupabase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptData, user?.id]); // Run when attemptData or user.id changes and are available


  useEffect(() => {
    if (attemptData) {
      const fetchFeedbackForAll = async () => {
        setIsFetchingFeedback(true);
        const incorrectAnswersIndices = attemptData.quizDefinition.quiz
          .map((q, index) => ({ q, index }))
          .filter(item => attemptData.userAnswers[item.index] !== item.q.answer)
          .map(item => item.index);

        const newFeedbackItems: FeedbackItem[] = [];
        for (const index of incorrectAnswersIndices) {
          const questionObj = attemptData.quizDefinition.quiz[index];
          const userAnswer = attemptData.userAnswers[index];
          try {
            const feedbackOutput = await provideEducationalFeedback({
              question: questionObj.question,
              userAnswer: userAnswer,
              correctAnswer: questionObj.answer,
              context: `L'utilisateur a répondu à la question : "${questionObj.question}". Sa réponse était "${userAnswer}", mais la bonne réponse était "${questionObj.answer}". Cette question a été générée en français. Veuillez fournir une explication ET une suggestion d'étude EN FRANÇAIS.`, 
            });
            newFeedbackItems.push({
              question: questionObj.question,
              userAnswer,
              correctAnswer: questionObj.answer,
              explanation: feedbackOutput.explanation,
              studySuggestion: feedbackOutput.studySuggestion,
            });
          } catch (error) {
            console.error(`Échec de l'obtention du feedback pour la question : ${questionObj.question}`, error);
            newFeedbackItems.push({
              question: questionObj.question,
              userAnswer,
              correctAnswer: questionObj.answer,
              explanation: 'Impossible de récupérer l\'explication pour le moment.',
              studySuggestion: 'Suggestion d\'étude non disponible.',
            });
            toast({ title: 'Erreur de Feedback', description: `Impossible d'obtenir l'explication pour : "${questionObj.question.substring(0,30)}..."`, variant: 'destructive' });
          }
        }
        setFeedbackItems(newFeedbackItems);
        setIsFetchingFeedback(false);
      };

      fetchFeedbackForAll();
    }
  }, [attemptData, toast]);
  
  useEffect(() => { 
    return () => {
      if (typeof window !== 'undefined') {
         localStorage.removeItem(QUIZ_ATTEMPT_RESULTS_KEY);
      }
    };
  }, []);


  if (isLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Chargement des Résultats...</p>
      </div>
    );
  }

  if (!attemptData) {
    return (
       <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <CardTitle>Aucun Résultat Disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune donnée de tentative de quiz trouvée. Cela peut être dû au fait que vous n'avez pas encore passé de quiz ou que les données ont été effacées.</p>
          <Button asChild className="mt-4">
            <Link href="/">Retour à l'Accueil</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { score, totalQuestions } = attemptData;
  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const scoreColor = percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col items-center w-full space-y-8 py-8">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl">Résultats du Quiz</CardTitle>
          <CardDescription className="text-lg">Voici votre performance, {user?.name || 'apprenant'} !</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`text-center p-6 rounded-lg ${percentage >= 70 ? 'bg-green-50 border border-green-200' : percentage >= 40 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-xl font-semibold">Votre Score :</p>
            <p className={`text-6xl font-bold ${scoreColor}`}>{score} / {totalQuestions}</p>
            <p className={`text-3xl font-semibold ${scoreColor}`}>{percentage.toFixed(1)}%</p>
            {isSavingScore && (
              <div className="flex items-center justify-center text-sm text-muted-foreground mt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sauvegarde du score en ligne...
              </div>
            )}
          </div>

          {(feedbackItems.length > 0 || isFetchingFeedback) && score < totalQuestions && (
            <div>
              <h3 className="text-2xl font-headline mt-6 mb-3 text-center">Revoyez vos Réponses Incorrectes</h3>
              {isFetchingFeedback && (
                <div className="flex items-center justify-center text-muted-foreground p-4">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Chargement des explications et suggestions...
                </div>
              )}
              <Accordion type="single" collapsible className="w-full">
                {feedbackItems.map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 text-left data-[state=open]:bg-muted/30">
                      <div className="flex items-start space-x-3 w-full">
                        <XCircle className="h-6 w-5 text-red-500 shrink-0 mt-1" />
                        <span className="font-medium flex-1 text-left">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4 space-y-3 bg-card border-t">
                      <p><strong>Votre Réponse :</strong> <span className="text-red-600 font-semibold">{item.userAnswer}</span></p>
                      <p><strong>Réponse Correcte :</strong> <span className="text-green-600 font-semibold">{item.correctAnswer}</span></p>
                      
                      <div className="p-3 bg-primary/5 border-l-4 border-primary rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-primary">Explication (Générée par IA) :</p>
                            <p className="text-sm text-primary/90">{item.explanation}</p>
                          </div>
                        </div>
                      </div>

                      {item.studySuggestion && (
                        <div className="p-3 bg-accent/10 border-l-4 border-accent rounded-md">
                          <div className="flex items-start space-x-2">
                            <GraduationCap className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-accent-foreground">Partie à Étudier (Suggestion IA) :</p>
                              <p className="text-sm text-accent-foreground/90">{item.studySuggestion}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
           {!isFetchingFeedback && feedbackItems.length === 0 && score < totalQuestions && (
              <p className="text-center text-muted-foreground p-4">Aucune réponse incorrecte à examiner ou les explications/suggestions sont en cours de chargement.</p>
            )}
          {score === totalQuestions && !isFetchingFeedback && (
            <div className="text-center p-6 rounded-lg bg-green-50 border border-green-300">
               <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-semibold text-green-700 font-headline">Félicitations !</p>
              <p className="text-lg text-green-600">Vous avez répondu correctement à toutes les questions !</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t">
          <Button variant="outline" onClick={() => router.push('/quiz/start')} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" /> Essayer un Autre Quiz
          </Button>
          <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" /> Retour à l'Accueil
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

