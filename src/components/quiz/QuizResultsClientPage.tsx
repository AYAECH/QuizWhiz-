'use client';

import { useEffect, useState }_ from 'react';
import { useRouter } from 'next/navigation';
import type { QuizAttempt, QuizQuestion, FeedbackItem } from '@/types';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { provideEducationalFeedback } from '@/ai/flows/provide-educational-feedback';
import { CheckCircle, XCircle, MessageSquare, Loader2, Home, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QUIZ_ATTEMPT_RESULTS_KEY = 'quizwhiz_quiz_attempt_results';

export function QuizResultsClientPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [attemptData, setAttemptData] = useState<QuizAttempt | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast({ title: 'Not Logged In', description: 'Please log in to view results.', variant: 'destructive'});
      router.push('/register');
      return;
    }

    const storedAttemptData = localStorage.getItem(QUIZ_ATTEMPT_RESULTS_KEY);
    if (storedAttemptData) {
      try {
        const parsedData = JSON.parse(storedAttemptData) as QuizAttempt;
        setAttemptData(parsedData);
      } catch (error) {
        console.error("Failed to parse attempt data", error);
        toast({ title: 'Error Loading Results', description: 'Could not load quiz results.', variant: 'destructive' });
        router.push('/'); // or quiz/start
        return;
      }
    } else {
      toast({ title: 'No Results Found', description: 'Quiz results not found.', variant: 'destructive' });
      router.push('/'); // or quiz/start
      return;
    }
    setIsLoading(false);
  }, [user, userLoading, router, toast]);

  useEffect(() => {
    if (attemptData) {
      const fetchFeedbackForAll = async () => {
        setIsFetchingFeedback(true);
        const incorrectAnswers = attemptData.quizDefinition.quiz.filter(
          (q, index) => attemptData.userAnswers[index] !== q.answer
        );

        const newFeedbackItems: FeedbackItem[] = [];
        for (const incorrectQ of incorrectAnswers) {
          const questionIndex = attemptData.quizDefinition.quiz.findIndex(q => q.question === incorrectQ.question);
          const userAnswer = attemptData.userAnswers[questionIndex];
          try {
            const feedbackOutput = await provideEducationalFeedback({
              question: incorrectQ.question,
              userAnswer: userAnswer,
              correctAnswer: incorrectQ.answer,
              context: `Original question: "${incorrectQ.question}". User selected "${userAnswer}" while correct was "${incorrectQ.answer}". From document: ${attemptData.pdfUriUsed ? "related to the uploaded PDF." : "general knowledge."}`, // Simplified context
            });
            newFeedbackItems.push({
              question: incorrectQ.question,
              userAnswer,
              correctAnswer: incorrectQ.answer,
              explanation: feedbackOutput.explanation,
            });
          } catch (error) {
            console.error(`Failed to get feedback for question: ${incorrectQ.question}`, error);
            newFeedbackItems.push({
              question: incorrectQ.question,
              userAnswer,
              correctAnswer: incorrectQ.answer,
              explanation: 'Could not retrieve explanation at this time.',
            });
            toast({ title: 'Feedback Error', description: `Could not get explanation for: "${incorrectQ.question.substring(0,30)}..."`, variant: 'destructive' });
          }
        }
        setFeedbackItems(newFeedbackItems);
        setIsFetchingFeedback(false);
      };

      fetchFeedbackForAll();
    }
  }, [attemptData, toast]);
  
  // useEffect(() => { // Cleanup results from local storage when component unmounts or on navigation
  //   return () => {
  //     localStorage.removeItem(QUIZ_ATTEMPT_RESULTS_KEY);
  //   };
  // }, []);


  if (isLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Results...</p>
      </div>
    );
  }

  if (!attemptData) {
    // This case should ideally be handled by the redirect in useEffect, but as a fallback:
    return <p>No quiz attempt data found. <Link href="/" className="text-primary underline">Go Home</Link></p>;
  }

  const { score, totalQuestions, quizDefinition, userAnswers } = attemptData;
  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const scoreColor = percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col items-center w-full space-y-8 py-8">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-headline text-primary">Quiz Results</CardTitle>
          <CardDescription className="text-lg">Here's how you performed, {user?.name || 'learner'}!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`text-center p-6 rounded-lg ${percentage >= 70 ? 'bg-green-50' : percentage >= 40 ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <p className="text-xl font-semibold">Your Score:</p>
            <p className={`text-6xl font-bold ${scoreColor}`}>{score} / {totalQuestions}</p>
            <p className={`text-3xl font-semibold ${scoreColor}`}>{percentage.toFixed(1)}%</p>
          </div>

          {feedbackItems.length > 0 || isFetchingFeedback ? (
            <div>
              <h3 className="text-2xl font-headline mt-6 mb-3 text-center">Review Your Answers</h3>
              {isFetchingFeedback && (
                <div className="flex items-center justify-center text-muted-foreground p-4">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading explanations...
                </div>
              )}
              <Accordion type="single" collapsible className="w-full">
                {feedbackItems.map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 text-left">
                      <div className="flex items-start space-x-3">
                        <XCircle className="h-6 w-5 text-red-500 shrink-0 mt-1" />
                        <span className="font-medium">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4 space-y-3 bg-card">
                      <p><strong>Your Answer:</strong> <span className="text-red-600">{item.userAnswer}</span></p>
                      <p><strong>Correct Answer:</strong> <span className="text-green-600">{item.correctAnswer}</span></p>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-700">Explanation:</p>
                            <p className="text-sm text-blue-700">{item.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            !isFetchingFeedback && score < totalQuestions && (
              <p className="text-center text-muted-foreground">No detailed feedback available for incorrect answers at this time.</p>
            )
          )}
          {score === totalQuestions && !isFetchingFeedback && (
            <div className="text-center p-6 rounded-lg bg-green-50 border border-green-300">
               <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-semibold text-green-700">Congratulations!</p>
              <p className="text-lg text-green-600">You answered all questions correctly!</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button variant="outline" onClick={() => router.push('/quiz/start')} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" /> Try Another Quiz
          </Button>
          <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
