
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpenCheck, Lightbulb, Brain, Sparkles, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useEffect, useState } from 'react';
import type { GeneratedQuiz } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateGeneralKnowledgeQuiz, type GeneralKnowledgeQuizOutput } from '@/ai/flows/generate-general-knowledge-quiz';
import { generateGeneralKnowledgeFlashFacts, type GeneralKnowledgeFlashFactsOutput } from '@/ai/flows/generate-general-knowledge-flash-facts';


const ACTIVE_QUIZ_DATA_KEY = 'quizwhiz_active_quiz_data';

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
  const [activeQuizContent, setActiveQuizContent] = useState<GeneratedQuiz | null>(null);
  
  const [selectedGkQuizTopic, setSelectedGkQuizTopic] = useState<string>(generalKnowledgeTopics[0].value);
  const [numGkQuizQuestions, setNumGkQuizQuestions] = useState<string>("10");
  const [isGeneratingGkQuiz, setIsGeneratingGkQuiz] = useState(false);

  const [selectedGkFlashFactsTopic, setSelectedGkFlashFactsTopic] = useState<string>(generalKnowledgeTopics[0].value);
  const [isGeneratingGkFlashFacts, setIsGeneratingGkFlashFacts] = useState(false);


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const activeQuizJson = localStorage.getItem(ACTIVE_QUIZ_DATA_KEY);
      if (activeQuizJson) {
        try {
          setActiveQuizContent(JSON.parse(activeQuizJson));
        } catch (e) {
          console.error("Erreur de chargement du contenu du quiz depuis localStorage", e);
          localStorage.removeItem(ACTIVE_QUIZ_DATA_KEY); // Clear corrupted data
          setActiveQuizContent(null);
        }
      } else {
        setActiveQuizContent(null);
      }
    }
  }, []);

  const canStartPdfQuiz = user && activeQuizContent && activeQuizContent.quiz && activeQuizContent.quiz.length > 0;
  const canViewPdfFlashInfo = user && activeQuizContent && activeQuizContent.flashFacts && activeQuizContent.flashFacts.length > 0 && activeQuizContent.flashFacts.some(fact => fact.trim() !== "");

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <BookOpenCheck className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Quiz sur Documents PDF</CardTitle>
            <CardDescription>Testez vos connaissances sur le dernier contenu téléchargé par un administrateur.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isClient ? (
               <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : !user ? (
              <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
            ) : !(activeQuizContent && activeQuizContent.quiz && activeQuizContent.quiz.length > 0) ? (
              <p className="text-sm text-destructive">Aucun quiz PDF actif. Un administrateur doit <Link href="/admin/upload" className="underline hover:text-destructive/80">télécharger un document</Link>.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Un quiz basé sur les documents PDF est disponible.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" disabled={!isClient || !canStartPdfQuiz}>
              <Link href="/quiz/start">
                Commencer Quiz PDF <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Lightbulb className="h-12 w-12 text-primary mb-2" />
            <CardTitle>Infos Flash sur Documents PDF</CardTitle>
            <CardDescription>Aperçus rapides des derniers documents PDF téléchargés.</CardDescription>
          </CardHeader>
           <CardContent>
             {!isClient ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : !user ? (
                <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link>.</p>
              ) : !(activeQuizContent && activeQuizContent.flashFacts && activeQuizContent.flashFacts.length > 0 && activeQuizContent.flashFacts.some(fact => fact.trim() !== "")) ? (
                <p className="text-sm text-destructive">Aucune info flash PDF. Un administrateur doit <Link href="/admin/upload" className="underline hover:text-destructive/80">générer du contenu</Link>.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Infos flash des PDF disponibles.</p>
              )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full" disabled={!isClient || !canViewPdfFlashInfo}>
              <Link href="/flash-info">
                Voir Infos Flash PDF <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Brain className="h-12 w-12 text-accent-foreground mb-2" />
            <CardTitle>Quiz Culture Générale</CardTitle>
            <CardDescription>Générez un quiz sur divers sujets de culture générale (Maroc et international).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user && isClient ? (
              <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link> pour utiliser cette fonction.</p>
            ) : (
              <>
                <div>
                  <Label htmlFor="gk-quiz-topic">Choisissez un sujet :</Label>
                  <Select value={selectedGkQuizTopic} onValueChange={setSelectedGkQuizTopic}>
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
            <CardDescription>Obtenez des infos clés sur des sujets de culture générale (focus Maroc).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {!user && isClient ? (
              <p className="text-sm text-destructive">Veuillez <Link href="/register" className="underline hover:text-destructive/80">vous inscrire ou vous connecter</Link> pour utiliser cette fonction.</p>
            ) : (
              <div>
                <Label htmlFor="gk-flash-topic">Choisissez un sujet :</Label>
                <Select value={selectedGkFlashFactsTopic} onValueChange={setSelectedGkFlashFactsTopic}>
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
  );
}
