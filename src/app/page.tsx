
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpenCheck, Lightbulb, Brain, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useEffect, useState } from 'react';
import type { GeneratedQuiz, QuizQuestion } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateGeneralKnowledgeQuiz, type GeneralKnowledgeQuizOutput } from '@/ai/flows/generate-general-knowledge-quiz';
import { generateGeneralKnowledgeFlashFacts, type GeneralKnowledgeFlashFactsOutput } from '@/ai/flows/generate-general-knowledge-flash-facts';
import { supabase } from '@/lib/supabaseClient';


const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data'; // Utilisé pour Culture G avant session, et pour PDF avant session (après chargement depuis DB)

const generalKnowledgeTopics = [
  { value: "Football", label: "Football (Culture Générale)" },
  { value: "Actualité Marocaine", label: "Actualité Marocaine Récente" },
  { value: "Finance du Maroc", label: "Finance et Banque au Maroc" },
  { value: "ANCFCC", label: "ANCFCC (Conservation Foncière Maroc)" },
  { value: "Agriculture au Maroc", label: "Agriculture au Maroc" },
  { value: "Économie du Maroc", label: "Économie du Maroc" },
  { value: "Mélange de sujets de culture générale (Maroc et International)", label: "Mélange Aléatoire (Tous Sujets)" },
];

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  
  // Pour le contenu PDF chargé depuis la base de données
  const [pdfContentFromDb, setPdfContentFromDb] = useState<GeneratedQuiz | null>(null);
  const [isLoadingPdfContent, setIsLoadingPdfContent] = useState(true);
  
  const [selectedGkQuizTopic, setSelectedGkQuizTopic] = useState<string>(generalKnowledgeTopics[0].value);
  const [numGkQuizQuestions, setNumGkQuizQuestions] = useState<string>("10");
  const [isGeneratingGkQuiz, setIsGeneratingGkQuiz] = useState(false);

  const [selectedGkFlashFactsTopic, setSelectedGkFlashFactsTopic] = useState<string>(generalKnowledgeTopics[0].value);
  const [isGeneratingGkFlashFacts, setIsGeneratingGkFlashFacts] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchActivePdfContent = async () => {
      if (!supabase) {
        console.warn("Supabase client non disponible pour charger le contenu PDF.");
        setIsLoadingPdfContent(false);
        setPdfContentFromDb(null);
        return;
      }
      setIsLoadingPdfContent(true);
      try {
        const { data, error } = await supabase
          .from('pdf_generated_content')
          .select('quiz_data, flash_facts_data')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: 'Fetched result is empty', normal case
          console.error('Erreur lors du chargement du contenu PDF actif:', error);
          toast({ title: 'Erreur de chargement PDF', description: 'Impossible de charger le contenu PDF actif depuis la base de données.', variant: 'destructive' });
          setPdfContentFromDb(null);
        } else if (data) {
          setPdfContentFromDb({
            quiz: (data.quiz_data as QuizQuestion[] | null) || [],
            flashFacts: (data.flash_facts_data as string[] | null) || [],
          });
        } else {
          setPdfContentFromDb(null); // Aucun contenu PDF actif trouvé
        }
      } catch (e) {
        console.error("Exception lors du chargement du contenu PDF", e);
        toast({ title: 'Erreur critique chargement PDF', description: 'Une erreur inattendue est survenue.', variant: 'destructive' });
        setPdfContentFromDb(null);
      } finally {
        setIsLoadingPdfContent(false);
      }
    };

    if (isClient) {
      fetchActivePdfContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]); // toast a été retiré des dépendances pour éviter des re-fetch inutiles. Le toast est dans le catch.


  const canStartPdfQuiz = user && pdfContentFromDb && pdfContentFromDb.quiz && pdfContentFromDb.quiz.length > 0;
  const canViewPdfFlashInfo = user && pdfContentFromDb && pdfContentFromDb.flashFacts && pdfContentFromDb.flashFacts.length > 0 && pdfContentFromDb.flashFacts.some(fact => fact.trim() !== "");

  const handleStartPdfQuiz = () => {
    if (!user) {
      toast({ title: 'Authentification Requise', description: 'Connectez-vous pour démarrer un quiz.', variant: 'destructive' });
      router.push('/register');
      return;
    }
    if (!pdfContentFromDb || !pdfContentFromDb.quiz || pdfContentFromDb.quiz.length === 0) {
      toast({ title: 'Aucun Quiz PDF', description: 'Aucun quiz PDF actif trouvé en base de données.', variant: 'destructive' });
      return;
    }
    localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(pdfContentFromDb));
    router.push('/quiz/start');
  };

  const handleViewPdfFlashInfo = () => {
    if (!user) {
      toast({ title: 'Authentification Requise', description: 'Connectez-vous pour voir les infos.', variant: 'destructive' });
      router.push('/register');
      return;
    }
    if (!pdfContentFromDb || (!pdfContentFromDb.flashFacts || pdfContentFromDb.flashFacts.length === 0 || !pdfContentFromDb.flashFacts.some(fact => fact.trim() !== ""))) {
       toast({ title: 'Aucune Info Flash PDF', description: 'Aucune info flash PDF active trouvée en base de données.', variant: 'destructive' });
      return;
    }
     const dataForLocalStorage: GeneratedQuiz = {
      quiz: pdfContentFromDb.quiz || [], 
      flashFacts: pdfContentFromDb.flashFacts || []
    };
    localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(dataForLocalStorage));
    router.push('/flash-info');
  };


  const handleGenerateGkQuiz = async () => {
    if (!user) {
      toast({ title: 'Authentification Requise', description: 'Connectez-vous pour générer un quiz.', variant: 'destructive' });
      router.push('/register');
      return;
    }
    if (!selectedGkQuizTopic) {
      toast({ title: 'Sujet manquant', description: 'Veuillez choisir un sujet.', variant: 'destructive' });
      return;
    }
    const numQ = parseInt(numGkQuizQuestions, 10);
    if (isNaN(numQ) || numQ < 5 || numQ > 50) {
      toast({ title: 'Nombre de questions invalide', description: 'Veuillez entrer un nombre entre 5 et 50.', variant: 'destructive' });
      return;
    }

    setIsGeneratingGkQuiz(true);
    try {
      const result: GeneralKnowledgeQuizOutput = await generateGeneralKnowledgeQuiz({ topic: selectedGkQuizTopic, numQuestions: numQ });
      const quizDataToStore: GeneratedQuiz = {
        quiz: result.quiz,
        flashFacts: result.flashFacts || [] 
      };
      localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(quizDataToStore));
      toast({ title: 'Quiz de Culture Générale Prêt !', description: `Quiz sur "${generalKnowledgeTopics.find(t => t.value === selectedGkQuizTopic)?.label || selectedGkQuizTopic}" généré.` });
      router.push('/quiz/start');
    } catch (error) {
      console.error('Erreur lors de la génération du quiz de culture générale:', error);
      toast({
        title: 'Échec de la Génération',
        description: (error instanceof Error ? error.message : String(error)) || 'Impossible de générer le quiz de culture générale.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingGkQuiz(false);
    }
  };

  const handleGenerateGkFlashFacts = async () => {
     if (!user) {
      toast({ title: 'Authentification Requise', description: 'Connectez-vous pour générer des infos flash.', variant: 'destructive' });
      router.push('/register');
      return;
    }
    if (!selectedGkFlashFactsTopic) {
      toast({ title: 'Sujet manquant', description: 'Veuillez choisir un sujet.', variant: 'destructive' });
      return;
    }
    setIsGeneratingGkFlashFacts(true);
    try {
      const result: GeneralKnowledgeFlashFactsOutput = await generateGeneralKnowledgeFlashFacts({ topic: selectedGkFlashFactsTopic });
      
      const dataToStore: GeneratedQuiz = {
        quiz: [], 
        flashFacts: result.flashFacts || []
      };
      localStorage.setItem(ACTIVE_QUIZ_DATA_KEY, JSON.stringify(dataToStore));
      toast({ title: 'Infos Flash Prêtes !', description: `Infos flash sur "${generalKnowledgeTopics.find(t => t.value === selectedGkFlashFactsTopic)?.label || selectedGkFlashFactsTopic}" générées.` });
      router.push('/flash-info');
    } catch (error) {
      console.error('Erreur lors de la génération des infos flash de culture générale:', error);
      toast({
        title: 'Échec de la Génération',
        description: (error instanceof Error ? error.message : String(error)) || 'Impossible de générer les infos flash.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingGkFlashFacts(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-headline font-bold text-primary">Bienvenue sur QuizWhiz!</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Votre plateforme interactive pour l'apprentissage. Générez des quiz à partir de PDF ou testez vos connaissances générales.
        </p>
      </div>

      {/* Section for PDF-based content */}
      <div className="w-full max-w-4xl space-y-8">
        <h2 className="text-3xl font-headline font-semibold text-center text-primary">Contenu Actif des Documents PDF</h2>
        
        {isLoadingPdfContent && isClient && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Chargement du contenu PDF actif...</p>
          </div>
        )}

        {!isLoadingPdfContent && !pdfContentFromDb && isClient && (
            <Card className="bg-yellow-50 border-yellow-400 text-yellow-700">
              <CardContent className="p-4 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Aucun Contenu PDF Actif</p>
                  <p className="text-xs">
                    Aucun quiz ou information flash généré à partir de PDF n'est actuellement actif.
                    Un administrateur doit <Link href="/admin/upload" className="underline hover:text-yellow-800">télécharger un document</Link> pour en générer.
                  </p>
                </div>
              </CardContent>
            </Card>
        )}

        {!isLoadingPdfContent && pdfContentFromDb && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <BookOpenCheck className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Quiz sur Documents PDF</CardTitle>
                <CardDescription>Testez vos connaissances sur le dernier contenu PDF téléchargé.</CardDescription>
              </CardHeader>
              <CardContent>
                {!isClient ? (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                ) : !user ? (
                  <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
                ) : !canStartPdfQuiz ? (
                   <p className="text-sm text-destructive">Aucun quiz PDF actif ou le quiz est vide. Un administrateur doit <Link href="/admin/upload" className="underline hover:text-destructive/80">télécharger un document</Link> et générer un quiz avec des questions.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Un quiz basé sur les documents PDF est disponible ({pdfContentFromDb.quiz.length} questions).</p>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleStartPdfQuiz} className="w-full" disabled={!isClient || !canStartPdfQuiz || isLoadingPdfContent}>
                  {isLoadingPdfContent ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                  Commencer Quiz PDF
                </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <Lightbulb className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Infos Flash sur Documents PDF</CardTitle>
                <CardDescription>Aperçus rapides des derniers documents PDF.</CardDescription>
              </CardHeader>
              <CardContent>
                {!isClient ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : !user ? (
                    <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
                  ) : !canViewPdfFlashInfo ? (
                    <p className="text-sm text-destructive">Aucune info flash PDF active ou les infos sont vides. Un administrateur doit <Link href="/admin/upload" className="underline hover:text-destructive/80">générer du contenu</Link> avec des informations flash.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Infos flash des PDF disponibles ({pdfContentFromDb.flashFacts?.length} faits).</p>
                  )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleViewPdfFlashInfo} variant="secondary" className="w-full" disabled={!isClient || !canViewPdfFlashInfo || isLoadingPdfContent}>
                   {isLoadingPdfContent ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                  Voir Infos Flash PDF
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Section for General Knowledge content */}
      <div className="w-full max-w-4xl space-y-8 pt-8 border-t mt-8">
        <h2 className="text-3xl font-headline font-semibold text-center text-accent-foreground">Culture Générale à la Demande</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <Brain className="h-12 w-12 text-accent-foreground mb-2" />
              <CardTitle>Quiz Culture Générale</CardTitle>
              <CardDescription>Générez un quiz sur divers sujets (Maroc et international).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && isClient ? (
                <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="gk-quiz-topic">Choisissez un sujet :</Label>
                    <Select value={selectedGkQuizTopic} onValueChange={setSelectedGkQuizTopic} disabled={isGeneratingGkQuiz || isGeneratingGkFlashFacts}>
                      <SelectTrigger id="gk-quiz-topic" className="w-full mt-1">
                        <SelectValue placeholder="Sélectionner un sujet" />
                      </SelectTrigger>
                      <SelectContent>
                        {generalKnowledgeTopics.map(topic => (
                          <SelectItem key={topic.value} value={topic.value}>{topic.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="num-gk-questions">Nombre de questions (5-50) :</Label>
                    <Input 
                      id="num-gk-questions" 
                      type="number" 
                      value={numGkQuizQuestions} 
                      onChange={(e) => setNumGkQuizQuestions(e.target.value)} 
                      min="5" max="50" 
                      className="w-full mt-1"
                      disabled={isGeneratingGkQuiz || isGeneratingGkFlashFacts}
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleGenerateGkQuiz} 
                disabled={!isClient || !user || isGeneratingGkQuiz || isGeneratingGkFlashFacts}
              >
                {isGeneratingGkQuiz ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {isGeneratingGkQuiz ? 'Génération en cours...' : 'Générer et Démarrer Quiz'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <Sparkles className="h-12 w-12 text-accent-foreground mb-2" />
              <CardTitle>Infos Flash Culture Générale</CardTitle>
              <CardDescription>Obtenez des infos clés (focus Maroc).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && isClient ? (
                <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
              ) : (
                <div>
                  <Label htmlFor="gk-flash-topic">Choisissez un sujet :</Label>
                  <Select value={selectedGkFlashFactsTopic} onValueChange={setSelectedGkFlashFactsTopic} disabled={isGeneratingGkFlashFacts || isGeneratingGkQuiz}>
                    <SelectTrigger id="gk-flash-topic" className="w-full mt-1">
                      <SelectValue placeholder="Sélectionner un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      {generalKnowledgeTopics.map(topic => (
                        <SelectItem key={topic.value} value={topic.value}>{topic.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={handleGenerateGkFlashFacts}
                disabled={!isClient || !user || isGeneratingGkFlashFacts || isGeneratingGkQuiz}
              >
                {isGeneratingGkFlashFacts ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {isGeneratingGkFlashFacts ? 'Génération en cours...' : 'Générer et Voir Infos Flash'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
