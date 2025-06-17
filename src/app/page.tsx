
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpenCheck, UploadCloud, Bell } from 'lucide-react';
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

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-headline font-bold text-primary">Welcome to QuizWhiz!</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your interactive platform for learning and assessment. Upload documents, generate quizzes, and test your knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <BookOpenCheck className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Start a Quiz</CardTitle> {/* font-headline applied via CardTitle component */}
            <CardDescription>Ready to test your knowledge? Begin a new quiz session.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isClient ? (
               <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !user ? (
              <p className="text-sm text-destructive">Please <Link href="/register" className="underline hover:text-destructive/80">register or log in</Link> to start a quiz.</p>
            ) : !quizAvailable ? (
              <p className="text-sm text-destructive">An admin needs to <Link href="/admin/upload" className="underline hover:text-destructive/80">upload a document and generate a quiz</Link> first.</p>
            ) : (
              <p className="text-sm text-muted-foreground">A quiz is available. Good luck!</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" disabled={!isClient || !canStartQuiz}>
              <Link href="/quiz/start">
                Start New Quiz <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <UploadCloud className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Admin: Upload Document</CardTitle> {/* font-headline applied via CardTitle component */}
            <CardDescription>Administrators can upload PDF documents to generate new quizzes.</CardDescription>
          </CardHeader>
           <CardContent>
            <p className="text-sm text-muted-foreground">Keep the learning material fresh and up-to-date.</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/admin/upload">
                Upload PDF <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Bell className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Notifications</CardTitle> {/* font-headline applied via CardTitle component */}
            <CardDescription>Stay updated with the latest news, instructions, and reminders.</CardDescription>
          </CardHeader>
           <CardContent>
            <p className="text-sm text-muted-foreground">Check for important announcements and updates.</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/notifications">
                View Notifications <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
