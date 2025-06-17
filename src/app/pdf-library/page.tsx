
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, AlertTriangle, Home, Library, BookOpenCheck, Lightbulb, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PdfContentEntry, GeneratedQuiz } from '@/types';

const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data';

export default function PdfLibraryPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [pdfContents, setPdfContents] = useState<PdfContentEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || userLoading) return;

    if (!user) {
      if (!userLoading) {
        toast({ title: 'Authentification Requise', description: 'Veuillez vous connecter pour voir la bibliothèque PDF.', variant: 'destructive' });
        router.push('/register');
      }
      return;
    }

    const fetchPdfContents = async () => {
      setIsLoadingData(true);
      if (!supabase) {
        toast({ title: 'Erreur Supabase', description: 'Client Supabase non initialisé.', variant: 'destructive' });
        setIsLoadingData(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('pdf_generated_content')
          .select('id, title, file_sources, quiz_data, flash_facts_data, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        setPdfContents(data as PdfContentEntry[] || []);
      } catch (error: any) {
        console.error('Erreur lors de la récupération des contenus PDF:', error);
        toast({
          title: 'Erreur de Chargement',
          description: error.message || 'Impossible de charger la bibliothèque PDF.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchPdfContents();
  }, [isClient, user, userLoading, router, toast]);

  const handleStartPdfQuiz = (content: PdfContentEntry) => {
    if (!content.quiz_data || content.quiz_data.length === 0) {
      toast({ title: 'Quiz Vide', description: 'Ce contenu PDF ne contient pas de questions de quiz.', variant: 'destructive'});
      return;
    }
    const quizToStore: GeneratedQuiz = {
      quiz: content.quiz_data,
      flashFacts: content.flash_facts_data || [],
      sourceTitle: content.title || "Quiz PDF"
    };
    localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(quizToStore));
    router.push('/quiz/start');
  };

  const handleViewPdfFlashInfo = (content: PdfContentEntry) => {
     if (!content.flash_facts_data || content.flash_facts_data.length === 0 || !content.flash_facts_data.some(fact => fact.trim() !== "")) {
      toast({ title: 'Infos Flash Vides', description: 'Ce contenu PDF ne contient pas d\'informations flash.', variant: 'destructive'});
      return;
    }
    const flashInfoToStore: GeneratedQuiz = {
      quiz: content.quiz_data || [], // Include quiz data even if empty, for consistency
      flashFacts: content.flash_facts_data,
      sourceTitle: content.title || "Infos Flash PDF"
    };
    localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(flashInfoToStore));
    router.push('/flash-info');
  };


  if (!isClient || userLoading || (isLoadingData && pdfContents.length === 0 && !user)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Chargement de la bibliothèque PDF...</p>
      </div>
    );
  }
  
  if (!user && !userLoading) {
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
      <Card className="w-full max-w-5xl mx-auto shadow-xl">
        <CardHeader className="text-center border-b pb-6">
           <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-4">
            <Library className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl">Bibliothèque de Contenu PDF</CardTitle>
          <CardDescription>Parcourez les quiz et informations flash générés à partir des documents PDF téléchargés.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingData && pdfContents.length === 0 ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Chargement des contenus...</p>
            </div>
          ) : !isLoadingData && pdfContents.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Aucun contenu PDF trouvé.</p>
                <p className="text-sm text-muted-foreground">Un administrateur doit <Link href="/admin/upload" className="underline hover:text-primary">télécharger des documents</Link> pour générer du contenu.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pdfContents.map((content) => (
                <Card key={content.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{content.title}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground pt-1">
                      <FileText className="h-4 w-4 mr-1.5" />
                      <span className="truncate max-w-xs sm:max-w-md md:max-w-lg">
                        Source(s): {content.file_sources.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ajouté le: {format(new Date(content.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {content.quiz_data && content.quiz_data.length > 0 ? `${content.quiz_data.length} questions de quiz disponibles.` : 'Aucun quiz disponible pour ce contenu.'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {content.flash_facts_data && content.flash_facts_data.length > 0 && content.flash_facts_data.some(f=>f.trim() !== "") ? `${content.flash_facts_data.filter(f=>f.trim() !== "").length} informations flash disponibles.` : 'Aucune information flash disponible pour ce contenu.'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewPdfFlashInfo(content)} 
                      disabled={!content.flash_facts_data || content.flash_facts_data.length === 0 || !content.flash_facts_data.some(fact => fact.trim() !== "")}
                      className="w-full sm:w-auto"
                    >
                      <Lightbulb className="mr-2 h-4 w-4" /> Voir Infos Flash
                    </Button>
                    <Button 
                      onClick={() => handleStartPdfQuiz(content)} 
                      disabled={!content.quiz_data || content.quiz_data.length === 0}
                      className="w-full sm:w-auto"
                    >
                      <BookOpenCheck className="mr-2 h-4 w-4" /> Démarrer le Quiz
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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
