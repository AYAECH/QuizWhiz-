
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedQuiz, QuizQuestion, QuizAttempt } from '@/types';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QUIZ_SESSION_KEY = 'quizwhiz_current_quiz_session_data'; 
const QUIZ_ATTEMPT_RESULTS_KEY = 'quizwhiz_quiz_attempt_results'; 

export function QuizClientPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [quizData, setQuizData] = useState<GeneratedQuiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userLoading) return; 

    if (!user) {
      toast({ title: 'Non Connecté', description: 'Veuillez vous connecter pour participer à un quiz.', variant: 'destructive'});
      router.push('/register');
      return;
    }

    const storedQuizData = localStorage.getItem(QUIZ_SESSION_KEY);
    if (storedQuizData) {
      try {
        const parsedData = JSON.parse(storedQuizData) as GeneratedQuiz;
        if (parsedData && parsedData.quiz && parsedData.quiz.length > 0) {
          setQuizData(parsedData);
        } else {
          throw new Error("Structure de données de quiz invalide ou quiz vide.");
        }
      } catch (error) {
        console.error("Échec de l'analyse des données du quiz depuis localStorage", error);
        toast({ title: 'Erreur de Chargement du Quiz', description: 'Impossible de charger les données du quiz. Veuillez essayer de commencer un nouveau quiz.', variant: 'destructive' });
        router.push('/quiz/start');
        return;
      }
    } else {
      toast({ title: 'Aucune Donnée de Quiz', description: 'Données du quiz non trouvées. Veuillez commencer un nouveau quiz.', variant: 'destructive' });
      router.push('/quiz/start');
      return;
    }
    setIsLoading(false);
  }, [user, userLoading, router, toast]);

  useEffect(() => {
    if (quizData) {
        setSelectedOption(userAnswers[currentQuestionIndex] || undefined);
    }
  }, [currentQuestionIndex, quizData, userAnswers]);


  const currentQuestion: QuizQuestion | undefined = quizData?.quiz[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (selectedOption && currentQuestion) {
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));
    } else if (!currentQuestion?.options.includes(userAnswers[currentQuestionIndex])) {
         toast({ title: 'Aucune Réponse Sélectionnée', description: 'Veuillez sélectionner une réponse avant de continuer.', variant: 'destructive' });
         return;
    }


    if (currentQuestionIndex < (quizData?.quiz.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedOption && currentQuestion) { 
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setIsSubmitting(true);
    let finalAnswers = userAnswers;
    if (selectedOption && currentQuestion) {
      finalAnswers = { ...userAnswers, [currentQuestionIndex]: selectedOption };
    }
    
    if (Object.keys(finalAnswers).length !== quizData?.quiz.length) {
        toast({ title: 'Quiz Incomplet', description: `Veuillez répondre aux ${quizData?.quiz.length} questions avant de soumettre. Vous avez répondu à ${Object.keys(finalAnswers).length}.`, variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    if (!quizData) {
        toast({ title: 'Erreur de Données du Quiz', description: 'Impossible de soumettre, les données du quiz sont manquantes.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    let score = 0;
    quizData.quiz.forEach((q, index) => {
      if (finalAnswers[index] === q.answer) {
        score++;
      }
    });

    const attemptData: QuizAttempt = {
      quizDefinition: quizData,
      userAnswers: finalAnswers,
      score,
      totalQuestions: quizData.quiz.length,
    };

    localStorage.setItem(QUIZ_ATTEMPT_RESULTS_KEY, JSON.stringify(attemptData));
    localStorage.removeItem(QUIZ_SESSION_KEY); 

    toast({ title: 'Quiz Soumis !', description: 'Redirection vers les résultats...', className: 'bg-accent text-accent-foreground' });
    router.push('/quiz/results');
  };

  if (isLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Chargement du Quiz...</p>
      </div>
    );
  }

  if (!quizData || !currentQuestion) {
    return (
      <Card className="w-full max-w-lg mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle>Erreur de Chargement du Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Impossible de charger les questions du quiz. Veuillez essayer de retourner au début.</p>
          <Button onClick={() => router.push('/quiz/start')} className="mt-4">
            Retour au Début
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const progress = ((currentQuestionIndex + 1) / quizData.quiz.length) * 100;

  return (
    <div className="flex flex-col items-center w-full">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary text-center">
            Question {currentQuestionIndex + 1} sur {quizData.quiz.length}
          </CardTitle>
          <Progress value={progress} className="w-full mt-2 h-3" aria-label={`${progress.toFixed(0)}% complété`} />
          <CardDescription className="text-lg text-center pt-4 min-h-[60px] font-medium text-foreground">
            {currentQuestion.question}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={handleOptionSelect}
            aria-label="Choisissez votre réponse"
          >
            {currentQuestion.options.map((option, index) => (
              <Label
                key={index}
                htmlFor={`option-${index}`}
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:border-primary hover:bg-primary/5
                  ${selectedOption === option ? 'border-primary bg-primary/10 ring-2 ring-primary shadow-md' : 'border-border'}`}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <span>{option}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0 || isSubmitting}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          {currentQuestionIndex < quizData.quiz.length - 1 ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Suivant <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmitQuiz} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Soumettre le Quiz
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
