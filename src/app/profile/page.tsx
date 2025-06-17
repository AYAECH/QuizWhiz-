
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, AlertTriangle, Home, UserCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserQuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  attempted_at: string;
  quiz_title: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [quizAttempts, setQuizAttempts] = useState<UserQuizAttempt[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || userLoading) return;

    if (!user || !user.id) {
      if (!userLoading) { // Only redirect if user loading is complete and no user found
        toast({ title: 'Authentification Requise', description: 'Veuillez vous connecter pour voir votre profil.', variant: 'destructive' });
        router.push('/register');
      }
      return;
    }

    const fetchQuizAttempts = async () => {
      setIsLoadingData(true);
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id, score, total_questions, attempted_at, quiz_title')
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false });

        if (error) {
          throw error;
        }
        setQuizAttempts(data || []);
      } catch (error: any) {
        console.error('Erreur lors de la récupération des tentatives de quiz:', error);
        toast({
          title: 'Erreur de Chargement',
          description: error.message || 'Impossible de charger l\'historique des quiz.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchQuizAttempts();
  }, [isClient, user, userLoading, router, toast]);

  const getScoreBadgeVariant = (score: number, total: number): "default" | "secondary" | "destructive" | "outline" => {
    if (total === 0) return "secondary";
    const percentage = (score / total) * 100;
    if (percentage >= 70) return "default"; // Corresponds to primary (often green in themes)
    if (percentage >= 40) return "secondary"; // Corresponds to accent (often yellow/orange)
    return "destructive"; // Often red
  };


  if (!isClient || userLoading || (isLoadingData && !quizAttempts.length)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Chargement du profil et de l'historique...</p>
      </div>
    );
  }

  if (!user) {
     // This case should ideally be caught by the useEffect redirect, but as a fallback:
    return (
         <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg text-destructive">Vous devez être connecté pour voir cette page.</p>
            <Button asChild className="mt-4">
                <Link href="/register">Se Connecter</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-4xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-6">
           <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-4">
            <UserCircle2 className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl">Profil de {user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center mb-6">
            <History className="h-6 w-6 mr-3 text-primary" />
            <h2 className="text-2xl font-headline font-semibold">Historique des Quiz</h2>
          </div>

          {isLoadingData && quizAttempts.length === 0 ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Chargement de l'historique...</p>
            </div>
          ) : quizAttempts.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Aucun quiz tenté pour le moment.</p>
                <p className="text-sm text-muted-foreground">Commencez un quiz pour voir votre historique ici.</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/">Explorer les Quiz</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Titre du Quiz</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Pourcentage</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">{attempt.quiz_title || 'Quiz Général'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadgeVariant(attempt.score, attempt.total_questions)} className="text-sm px-2 py-1">
                          {attempt.score} / {attempt.total_questions}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.total_questions > 0 
                          ? `${((attempt.score / attempt.total_questions) * 100).toFixed(0)}%`
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(attempt.attempted_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         <CardFooter className="border-t pt-6">
            <Button asChild variant="outline" className="w-full sm:w-auto mx-auto">
                <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'Accueil
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
