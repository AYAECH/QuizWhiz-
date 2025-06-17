
'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, UploadCloud, FileText, AlertTriangle, ListPlus, FileArchive, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import type { QuizQuestion } from '@/types';

// La clé localStorage QUIZ_DATA_STORAGE_KEY n'est plus utilisée ici pour stocker le contenu PDF.
// Elle sera utilisée par la page d'accueil pour charger le contenu actif (PDF ou Culture G) avant de démarrer un quiz/flash info.

export function PdfUploadForm() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [numQuestions, setNumQuestions] = useState<string>("20"); // Max 100 in the flow
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContentInfo, setGeneratedContentInfo] = useState<{ title: string; questions: number; hasFlashFacts: boolean } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      const allPdfs = selectedFiles.every(file => file.type === 'application/pdf');
      
      if (!allPdfs) {
        toast({
          title: 'Type de Fichier Invalide',
          description: 'Veuillez sélectionner uniquement des fichiers PDF.',
          variant: 'destructive',
        });
        setFiles(null);
        if (event.target) event.target.value = ''; 
        return;
      }
      setFiles(selectedFiles);
      setGeneratedContentInfo(null); 
    } else {
      setFiles(null);
    }
  };

  const handleNumQuestionsChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNumQuestions(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files || files.length === 0) {
      toast({
        title: 'Aucun Fichier Sélectionné',
        description: 'Veuillez sélectionner un ou plusieurs fichiers PDF à télécharger.',
        variant: 'destructive',
      });
      return;
    }

    const parsedNumQuestions = parseInt(numQuestions, 10);
    if (isNaN(parsedNumQuestions) || parsedNumQuestions < 5 || parsedNumQuestions > 100) { // Updated max to 100
      toast({
        title: 'Nombre de Questions Invalide',
        description: 'Veuillez entrer un nombre entre 5 et 100.', // Updated max to 100
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedContentInfo(null);

    if (!supabase) {
        toast({ title: 'Erreur Supabase', description: 'Client Supabase non initialisé.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
      const pdfDataUrisPromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      });

      const pdfDataUris = await Promise.all(pdfDataUrisPromises);
      const fileNamesString = files.map(f => f.name).join(', ');
        
      try {
        const contentOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUris, numQuestions: parsedNumQuestions });

        if (contentOutput && ( (contentOutput.quiz && contentOutput.quiz.length > 0) || (contentOutput.flashFacts && contentOutput.flashFacts.length > 0) )) {
          // 1. Désactiver tout contenu PDF actif existant
          const { error: updateError } = await supabase
            .from('pdf_generated_content')
            .update({ is_active: false })
            .eq('is_active', true);

          if (updateError) {
            console.error('Erreur lors de la désactivation du contenu PDF existant:', updateError);
            throw new Error('Impossible de mettre à jour l\'état du contenu existant.');
          }

          // 2. Insérer le nouveau contenu PDF comme actif
          const { error: insertError } = await supabase
            .from('pdf_generated_content')
            .insert({
              quiz_data: contentOutput.quiz as QuizQuestion[], 
              flash_facts_data: contentOutput.flashFacts,
              file_names: fileNamesString,
              is_active: true,
            });
          
          if (insertError) {
            console.error('Erreur lors de l\'insertion du nouveau contenu PDF:', insertError);
            throw new Error('Impossible de sauvegarder le nouveau contenu généré.');
          }
          
          const hasMeaningfulFlashFacts = !!contentOutput.flashFacts && contentOutput.flashFacts.length > 0 && contentOutput.flashFacts.some(fact => fact.trim() !== "" && !fact.toLowerCase().includes("aucune information flash spécifique"));
          const numGeneratedQuestions = contentOutput.quiz ? contentOutput.quiz.length : 0;
          
          setGeneratedContentInfo({ 
            title: fileNamesString, 
            questions: numGeneratedQuestions,
            hasFlashFacts: hasMeaningfulFlashFacts
          });

          toast({
            title: 'Contenu PDF Enregistré et Actif !',
            description: `${numGeneratedQuestions} questions et ${hasMeaningfulFlashFacts ? 'des informations flash ont été générées' : 'aucune information flash pertinente n\'a été générée'} à partir de ${files.length} document(s) et sauvegardées.`,
          });

        } else {
          throw new Error('L\'IA n\'a pas réussi à générer de contenu significatif (quiz ou informations flash).');
        }
      } catch (aiError) {
        console.error('Erreur de traitement IA ou de sauvegarde DB:', aiError);
        toast({
          title: 'Erreur lors de la Génération ou Sauvegarde',
          description: (aiError instanceof Error ? aiError.message : String(aiError)) || 'L\'IA n\'a pas pu traiter le(s) PDF ou une erreur de base de données est survenue.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Erreur de lecture de fichier ou de soumission de formulaire:', e);
      toast({
        title: 'Échec du Traitement Initial',
        description: (e instanceof Error ? e.message : String(e)) || 'Une erreur inattendue s\'est produite lors de la lecture des fichiers.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload" className="text-base">Télécharger Document(s) PDF</Label>
        <Input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          aria-describedby="file-upload-help"
          disabled={isLoading}
        />
        <p id="file-upload-help" className="text-sm text-muted-foreground">
          Sélectionnez un ou plusieurs fichiers PDF. Le contenu généré (quiz et/ou infos flash) remplacera le contenu PDF actif actuel.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="num-questions" className="text-base">Nombre de Questions de Quiz</Label>
        <Input
          id="num-questions"
          type="number"
          value={numQuestions}
          onChange={handleNumQuestionsChange}
          min="5"
          max="100" // Updated max to 100
          step="1"
          className="w-full"
          aria-describedby="num-questions-help"
          disabled={isLoading}
        />
        <p id="num-questions-help" className="text-sm text-muted-foreground">
          Entrez le nombre de questions de quiz souhaité (5-100). 
        </p>
      </div>

      {files && files.length > 0 && !generatedContentInfo && (
        <Card className="border-dashed border-primary bg-primary/5">
          <CardContent className="p-4 text-center">
            {files.length === 1 ? <FileText className="mx-auto h-10 w-10 text-primary mb-2" /> : <FileArchive className="mx-auto h-10 w-10 text-primary mb-2" />}
            <p className="text-sm font-medium text-primary">Fichier(s) sélectionné(s) : {files.map(f => f.name).join(', ')}</p>
            <p className="text-xs text-muted-foreground">Taille totale : {(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(2)} KB</p>
          </CardContent>
        </Card>
      )}
      
      {generatedContentInfo && (
         <Card className={generatedContentInfo.hasFlashFacts ? "bg-green-50 border-green-500" : "bg-orange-50 border-orange-500"}>
          <CardContent className="p-4 text-center space-y-1">
            <div className="flex justify-center items-center gap-2">
                <ListPlus className={`h-8 w-8 ${generatedContentInfo.hasFlashFacts ? 'text-green-700' : 'text-orange-700'}`} />
                {generatedContentInfo.hasFlashFacts && <Info className="h-8 w-8 text-green-700" />}
                {!generatedContentInfo.hasFlashFacts && <AlertCircle className="h-8 w-8 text-orange-700" />}
            </div>
            <p className={`text-sm font-medium ${generatedContentInfo.hasFlashFacts ? 'text-green-700' : 'text-orange-700'}`}>Contenu généré et sauvegardé à partir de : {generatedContentInfo.title.length > 50 ? `${generatedContentInfo.title.substring(0,50)}...` : generatedContentInfo.title}</p>
            <p className={`text-xs ${generatedContentInfo.hasFlashFacts ? 'text-green-600' : 'text-orange-600'}`}>{generatedContentInfo.questions} questions créées.</p>
            {generatedContentInfo.hasFlashFacts && <p className="text-xs text-green-600">Informations flash également générées.</p>}
            {!generatedContentInfo.hasFlashFacts && <p className="text-xs text-orange-600">Aucune information flash pertinente n'a été générée pour ce(s) document(s).</p>}
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !files || files.length === 0}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Traitement et Sauvegarde...' : 'Télécharger et Remplacer Contenu Actif'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Note Importante :</p>
            <p className="text-xs">
              La génération et sauvegarde du contenu peut prendre quelques instants. Assurez-vous que le contenu du PDF est clair et que le nombre de questions demandé n'est pas excessif (max 100). Les nouvelles données remplaceront le contenu PDF actif précédent.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

