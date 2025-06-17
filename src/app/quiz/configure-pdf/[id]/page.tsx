
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Home, FileText, ArrowRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PdfContentEntry, GeneratedQuiz } from '@/types';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';

const QUIZ_SESSION_KEY = 'quizwhiz_current_quiz_session_data';

export default function ConfigurePdfQuizPage() {
  const router = useRouter();
  const params = useParams();
  const pdfId = params.id as string;

  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [pdfEntry, setPdfEntry] = useState<PdfContentEntry | null>(null);
  const [numQuestions, setNumQuestions] = useState<string>("10");
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !pdfId || userLoading) return;

    if (!user) {
      if (!userLoading) {
        toast({ title: 'Authentification Requise', description: 'Veuillez vous connecter.', variant: 'destructive' });
        router.push('/register');
      }
      return;
    }

    const fetchPdfEntry = async () => {
      setIsLoadingPageData(true);
      if (!supabase) {
        toast({ title: 'Erreur Supabase', description: 'Client Supabase non initialisé.', variant: 'destructive' });
        setIsLoadingPageData(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('pdf_generated_content')
          .select('id, title, file_sources, pdf_data_uris, created_at')
          .eq('id', pdfId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Document PDF non trouvé.');
        
        setPdfEntry(data as PdfContentEntry);
      } catch (error: any) {
        console.error('Erreur lors de la récupération du document PDF:', error);
        toast({
          title: 'Erreur de Chargement',
          description: error.message || 'Impossible de charger les détails du document PDF.',
          variant: 'destructive',
        });
        router.push('/pdf-library');
      } finally {
        setIsLoadingPageData(false);
      }
    };

    fetchPdfEntry();
  }, [isClient, pdfId, user, userLoading, router, toast]);

  const handleGenerateAndStartQuiz = async () => {
    if (!pdfEntry || !pdfEntry.pdf_data_uris || pdfEntry.pdf_data_uris.length === 0) {
      toast({ title: 'Données PDF Manquantes', description: 'Impossible de trouver le contenu du PDF pour générer le quiz.', variant: 'destructive' });
      return;
    }
    const numQ = parseInt(numQuestions, 10);
    if (isNaN(numQ) || numQ < 5 || numQ > 2000) { // Max 2000 as per generateQuizFromPdf flow
      toast({ title: 'Nombre de questions invalide', description: 'Veuillez entrer un nombre entre 5 et 2000.', variant: 'destructive' });
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const result: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ 
        pdfDataUris: pdfEntry.pdf_data_uris, 
        numQuestions: numQ 
      });

      if (!result.quiz || result.quiz.length === 0) {
        toast({ 
          title: 'Aucune Question Générée', 
          description: 'L\'IA n\'a pas pu générer de questions de quiz à partir de ce document. Essayez avec un autre document ou moins de questions.',
          variant: 'default' // Not necessarily a 'destructive' error, could be content-related
        });
        setIsGeneratingQuiz(false);
        return;
      }
      
      const quizDataToStore: GeneratedQuiz = {
        quiz: result.quiz,
        flashFacts: result.flashFacts || [],
        sourceTitle: pdfEntry.title || "Quiz PDF",
        pdfDocId: pdfEntry.id
      };
      localStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(quizDataToStore));
      toast({ title: 'Quiz Prêt !', description: `Quiz sur "${pdfEntry.title}" généré avec ${result.quiz.length} questions.` });
      router.push('/quiz/play');

    } catch (error) {
      console.error('Erreur lors de la génération du quiz PDF:', error);
      toast({
        title: 'Échec de la Génération du Quiz',
        description: (error instanceof Error ? error.message : String(error)) || 'Une erreur est survenue lors de la génération du quiz.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };


  if (!isClient || isLoadingPageData || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Chargement de la configuration du quiz...</p>
      </div>
    );
  }

  if (!pdfEntry) {
    // This case should ideally be handled by the redirect in useEffect if PDF not found
    return (
      <Card className="w-full max-w-md mx-auto mt-10 text-center shadow-lg">
        <CardHeader>
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle>Document PDF Non Trouvé</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Le document que vous essayez de configurer n'existe pas ou n'a pas pu être chargé.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/pdf-library">Retour à la Bibliothèque</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex justify-center items-center py-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
            <FileText className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl">Configurer le Quiz pour :</CardTitle>
          <CardDescription className="text-xl font-semibold text-primary-dark">{pdfEntry.title}</CardDescription>
          <p className="text-sm text-muted-foreground">Fichiers sources: {pdfEntry.file_sources.join(', ')}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="num-pdf-questions" className="text-base">Nombre de questions souhaitées (5-2000) :</Label>
            <Input 
              id="num-pdf-questions" 
              type="number" 
              value={numQuestions} 
              onChange={(e) => setNumQuestions(e.target.value)} 
              min="5" max="2000" 
              className="w-full mt-1 text-base"
              disabled={isGeneratingQuiz}
            />
            <p className="text-xs text-muted-foreground mt-1">L'IA essaiera de générer ce nombre de questions à partir du contenu du PDF.</p>
          </div>

          {/* Section pour l'affichage du PDF (simplifié pour l'instant) */}
            <Card className="bg-muted/30 p-4">
                <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-lg flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground"/>Aperçu du Document</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground">
                        Le quiz sera basé sur le contenu du document PDF intitulé "{pdfEntry.title}".
                        Assurez-vous que le PDF contient suffisamment de texte pour générer le nombre de questions souhaité.
                    </p>
                    {/* 
                        Pour un véritable aperçu du PDF, une intégration plus complexe serait nécessaire (ex: react-pdf).
                        Pour l'instant, nous affichons juste des informations.
                        Alternative: si pdf_data_uris[0] existe, on pourrait tenter un <embed> ou <iframe>.
                        <embed src={pdfEntry.pdf_data_uris[0]} type="application/pdf" width="100%" height="200px" /> 
                        Attention: les data URIs peuvent être très longues et causer des problèmes de performance/navigateur.
                        Une meilleure approche serait de stocker les PDF dans Supabase Storage et utiliser leurs URLs publiques ici.
                    */}
                </CardContent>
            </Card>


          <Button 
            className="w-full text-base py-6" 
            onClick={handleGenerateAndStartQuiz} 
            disabled={isGeneratingQuiz || !pdfEntry}
          >
            {isGeneratingQuiz ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ArrowRight className="mr-2 h-5 w-5" />}
            {isGeneratingQuiz ? 'Génération du Quiz en cours...' : 'Générer et Démarrer le Quiz'}
          </Button>
        </CardContent>
        <CardFooter className="flex-col space-y-2 items-center">
            <p className="text-xs text-muted-foreground text-center px-4">
                La génération du quiz peut prendre quelques instants en fonction de la taille du PDF et du nombre de questions.
            </p>
          <Button asChild variant="outline" className="w-full max-w-xs">
            <Link href="/pdf-library">
              <Home className="mr-2 h-4 w-4" /> Annuler et Retour à la Bibliothèque
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
