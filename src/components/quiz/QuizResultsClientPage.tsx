
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
import { CheckCircle, XCircle, MessageSquare, Loader2, Home, RotateCcw, HelpCircle } from 'lucide-react';
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
        router.push('/'); 
        return;
      }
    } else {
      toast({ title: 'No Results Found', description: 'Quiz results not found.', variant: 'destructive' });
      router.push('/'); 
      return;
    }
    setIsLoading(false);
  }, [user, userLoading, router, toast]);

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
              context: `The user was asked: "${questionObj.question}". They answered "${userAnswer}", but the correct answer was "${questionObj.answer}". This question was generated from an uploaded PDF document. Please explain why the user's answer is incorrect and the correct answer is correct, based on general knowledge that would be found in such a document.`, 
            });
            newFeedbackItems.push({
              question: questionObj.question,
              userAnswer,
              correctAnswer: questionObj.answer,
              explanation: feedbackOutput.explanation,
            });
          } catch (error) {
            console.error(`Failed to get feedback for question: ${questionObj.question}`, error);
            newFeedbackItems.push({
              question: questionObj.question,
              userAnswer,
              correctAnswer: questionObj.answer,
              explanation: 'Could not retrieve explanation at this time.',
            });
            toast({ title: 'Feedback Error', description: `Could not get explanation for: "${questionObj.question.substring(0,30)}..."`, variant: 'destructive' });
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
        // Optionally clear results on unmount if desired, or keep for later review until new quiz taken
        // localStorage.removeItem(QUIZ_ATTEMPT_RESULTS_KEY);
      }
    };
  }, []);


  if (isLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Results...</p>
      </div>
    );
  }

  if (!attemptData) {
    return (
       <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <CardTitle>No Results Available</CardTitle> {/* font-headline applied via CardTitle component */}
        </CardHeader>
        <CardContent>
          <p>No quiz attempt data found. This might be because you haven't taken a quiz yet, or the data was cleared.</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { score, totalQuestions, quizDefinition, userAnswers } = attemptData;
  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const scoreColor = percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col items-center w-full space-y-8 py-8">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl">Quiz Results</CardTitle> {/* font-headline applied via CardTitle component */}
          <CardDescription className="text-lg">Here's how you performed, {user?.name || 'learner'}!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`text-center p-6 rounded-lg ${percentage >= 70 ? 'bg-green-50 border border-green-200' : percentage >= 40 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-xl font-semibold">Your Score:</p>
            <p className={`text-6xl font-bold ${scoreColor}`}>{score} / {totalQuestions}</p>
            <p className={`text-3xl font-semibold ${scoreColor}`}>{percentage.toFixed(1)}%</p>
          </div>

          {(feedbackItems.length > 0 || isFetchingFeedback) && score < totalQuestions && (
            <div>
              <h3 className="text-2xl font-headline mt-6 mb-3 text-center">Review Your Incorrect Answers</h3>
              {isFetchingFeedback && (
                <div className="flex items-center justify-center text-muted-foreground p-4">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading explanations...
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
                      <p><strong>Your Answer:</strong> <span className="text-red-600 font-semibold">{item.userAnswer}</span></p>
                      <p><strong>Correct Answer:</strong> <span className="text-green-600 font-semibold">{item.correctAnswer}</span></p>
                      <div className="p-3 bg-primary/5 border-l-4 border-primary rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-primary">Explanation (AI Generated):</p>
                            <p className="text-sm text-primary/90">{item.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
           {!isFetchingFeedback && feedbackItems.length === 0 && score < totalQuestions && (
              <p className="text-center text-muted-foreground p-4">No incorrect answers to review, or explanations are still loading.</p>
            )}
          {score === totalQuestions && !isFetchingFeedback && (
            <div className="text-center p-6 rounded-lg bg-green-50 border border-green-300">
               <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-semibold text-green-700 font-headline">Congratulations!</p>
              <p className="text-lg text-green-600">You answered all questions correctly!</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t">
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
