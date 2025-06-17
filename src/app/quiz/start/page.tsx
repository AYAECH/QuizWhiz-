'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, PlayCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { GeneratedQuiz } from '@/types';

const PDF_STORAGE_KEY = 'quizwhiz_active_pdf_uri';
const QUIZ_SESSION_KEY = 'quizwhiz_current_quiz_session_data'; // For passing generated quiz to play page

export default function QuizStartPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const activePdfUri = localStorage.getItem(PDF_STORAGE_KEY);
    setPdfUri(activePdfUri);
  }, []);

  const handleStartQuiz = async () => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please register or log in to start a quiz.', variant: 'destructive' });
      router.push('/register');
      return;
    }
    if (!pdfUri) {
      toast({ title: 'No Document Found', description: 'An admin needs to upload a PDF document first.', variant: 'destructive' });
      router.push('/admin/upload');
      return;
    }

    setIsGenerating(true);
    try {
      const quizOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUri: pdfUri });
      
      if (quizOutput && quizOutput.quiz && quizOutput.quiz.length > 0) {
        const quizData: GeneratedQuiz = { quiz: quizOutput.quiz };
        localStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(quizData));
        toast({ title: 'Quiz Ready!', description: `Your quiz with ${quizOutput.quiz.length} questions is ready.` });
        router.push('/quiz/play');
      } else {
        throw new Error('AI failed to generate quiz questions or returned an empty quiz.');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Failed to Start Quiz',
        description: (error instanceof Error ? error.message : String(error)) || 'Could not generate the quiz. The PDF might be invalid or the AI service is unavailable.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
    // Do not set isGenerating to false here if navigation is successful, to avoid button re-enable flicker
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
          <CardTitle className="font-headline">Login Required</CardTitle>
          <CardDescription>You need to be logged in to start a quiz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/register">Register or Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!pdfUri) {
     return (
      <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">No Quiz Document</CardTitle>
          <CardDescription>No PDF document has been uploaded by an admin yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Please ask an administrator to upload a document.</p>
          <Button asChild variant="secondary">
            <Link href="/admin/upload">Admin Upload Page</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
      <Card className="w-full max-w-lg shadow-xl p-8">
         <PlayCircle className="h-20 w-20 text-primary mx-auto mb-6" />
        <h1 className="text-4xl font-headline font-bold text-primary mb-4">Ready to Start?</h1>
        <p className="text-lg text-muted-foreground mb-8">
          A new quiz will be generated from the active document. This may take a few moments.
        </p>
        <Button onClick={handleStartQuiz} disabled={isGenerating || !pdfUri} size="lg" className="w-full max-w-xs mx-auto">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            'Start Quiz Now'
          )}
        </Button>
        {isGenerating && (
          <p className="text-sm text-muted-foreground mt-4">Please wait, we're preparing your questions...</p>
        )}

        <Card className="mt-8 bg-blue-50 border-blue-400 text-blue-700">
          <CardContent className="p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">Note on "Dynamic Renewal":</p>
              <p className="text-xs">
                Each time you click "Start Quiz Now", a quiz is freshly generated from the currently active PDF document.
                This ensures questions can vary if the AI model introduces variability or if the source document is updated by an admin.
              </p>
            </div>
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}
