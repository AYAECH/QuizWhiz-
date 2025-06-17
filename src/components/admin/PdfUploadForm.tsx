
'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, UploadCloud, FileText, AlertTriangle, ListPlus, FileArchive, Info, AlertCircle, BookText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import type { QuizQuestion } from '@/types';

export function PdfUploadForm() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [title, setTitle] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<string>("20");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContentInfo, setGeneratedContentInfo] = useState<{ title: string; questions: number; hasFlashFacts: boolean; fileNames: string[] } | null>(null);
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
      if (!title) { 
        setTitle(selectedFiles.map(f => f.name).join(', ').substring(0, 100)); 
      }
      setGeneratedContentInfo(null); 
    } else {
      setFiles(null);
    }
  };

  const handleNumQuestionsChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNumQuestions(event.target.value);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
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
    if (!title.trim()) {
      toast({
        title: 'Titre Manquant',
        description: 'Veuillez donner un titre à ce lot de contenu PDF.',
        variant: 'destructive',
      });
      return;
    }

    const parsedNumQuestions = parseInt(numQuestions, 10);
    if (isNaN(parsedNumQuestions) || parsedNumQuestions < 5 || parsedNumQuestions > 2000) {
      toast({
        title: 'Nombre de Questions Invalide',
        description: 'Veuillez entrer un nombre entre 5 et 2000.',
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
      const fileNamesArray = files.map(f => f.name);
        
      // This outer try-catch is for the overall process including AI call and DB insert.
      try {
        const contentOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUris, numQuestions: parsedNumQuestions });

        const hasValidQuiz = contentOutput.quiz && contentOutput.quiz.length > 0;
        const hasValidFlashFacts = contentOutput.flashFacts && contentOutput.flashFacts.length > 0 && contentOutput.flashFacts.some(f => f.trim() !== "");

        if (hasValidQuiz || hasValidFlashFacts) {
          const { error: insertError } = await supabase
            .from('pdf_generated_content')
            .insert({
              title: title.trim(),
              file_sources: fileNamesArray,
              quiz_data: hasValidQuiz ? contentOutput.quiz as QuizQuestion[] : null, 
              flash_facts_data: hasValidFlashFacts ? contentOutput.flashFacts : null,
            });
          
          if (insertError) {
            console.error('Erreur lors de l\'insertion du nouveau contenu PDF:', insertError);
            throw new Error('Impossible de sauvegarder le nouveau contenu généré. Détails: ' + insertError.message);
          }
          
          const numGeneratedQuestions = hasValidQuiz ? contentOutput.quiz.length : 0;
          
          setGeneratedContentInfo({ 
            title: title.trim(), 
            questions: numGeneratedQuestions,
            hasFlashFacts: hasValidFlashFacts,
            fileNames: fileNamesArray
          });

          toast({
            title: 'Contenu PDF Ajouté !',
            description: `"${title.trim()}" avec ${numGeneratedQuestions} question(s) et ${hasValidFlashFacts ? 'des infos flash a été ajouté' : 'aucune info flash pertinente n\'a été générée'} à la bibliothèque.`,
          });
          
          setFiles(null);
          setTitle("");
          const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = "";

        } else {
          // This case is hit if the flow returns empty quiz and empty flash_facts
          setGeneratedContentInfo(null);
          toast({
            title: 'Aucun Contenu Significatif Généré',
            description: "L'IA n'a pas pu extraire de quiz valide ou d'informations flash pertinentes de ce(s) document(s) PDF.",
            variant: 'default', // Changed to default to be less alarming than 'destructive'
          });
        }
      } catch (processingError) { // Catches errors from generateQuizFromPdf or DB insert
        console.error('Erreur de traitement IA ou de sauvegarde DB:', processingError);
        setGeneratedContentInfo(null); // Clear any potentially stale info
        toast({
          title: 'Erreur de Traitement',
          description: (processingError instanceof Error ? processingError.message : String(processingError)) || 'Une erreur est survenue lors de la génération ou de la sauvegarde du contenu.',
          variant: 'destructive',
        });
      }
    } catch (fileReadingError) { // This catch is for file reading errors before AI processing
      console.error('Erreur de lecture de fichier ou de soumission de formulaire:', fileReadingError);
      setGeneratedContentInfo(null);
      toast({
        title: 'Échec du Traitement Initial',
        description: (fileReadingError instanceof Error ? fileReadingError.message : String(fileReadingError)) || 'Une erreur inattendue s\'est produite lors de la lecture des fichiers.',
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-title" className="text-base">Titre du Contenu PDF</Label>
        <Input
          id="pdf-title"
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Ex: Rapport Annuel Q1, Cours de Topographie Chap. 1-3"
          className="w-full"
          disabled={isLoading}
          maxLength={150}
        />
         <p className="text-sm text-muted-foreground">
          Donnez un nom descriptif à ce lot de PDF et au contenu qui en sera généré.
        </p>
      </div>

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
          Sélectionnez un ou plusieurs fichiers PDF. Le contenu généré sera ajouté à la bibliothèque.
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
          max="2000"
          step="1"
          className="w-full"
          aria-describedby="num-questions-help"
          disabled={isLoading}
        />
        <p id="num-questions-help" className="text-sm text-muted-foreground">
          Entrez le nombre de questions de quiz souhaité (5-2000). 
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
         <Card className={generatedContentInfo.hasFlashFacts || generatedContentInfo.questions > 0 ? "bg-green-50 border-green-500" : "bg-orange-50 border-orange-500"}>
          <CardContent className="p-4 text-center space-y-1">
             <div className="flex justify-center items-center gap-2">
                {(generatedContentInfo.hasFlashFacts || generatedContentInfo.questions > 0) ? 
                 <ListPlus className='h-8 w-8 text-green-700' /> : 
                 <AlertCircle className="h-8 w-8 text-orange-700" />}
            </div>
            <p className={`text-sm font-medium ${(generatedContentInfo.hasFlashFacts || generatedContentInfo.questions > 0) ? 'text-green-700' : 'text-orange-700'}`}>
              Contenu "{generatedContentInfo.title.length > 50 ? `${generatedContentInfo.title.substring(0,50)}...` : generatedContentInfo.title}" ajouté.
            </p>
            <p className={`text-xs ${(generatedContentInfo.hasFlashFacts || generatedContentInfo.questions > 0) ? 'text-green-600' : 'text-orange-600'}`}>
              Sources: {generatedContentInfo.fileNames.join(', ').substring(0, 70)}{generatedContentInfo.fileNames.join(', ').length > 70 ? '...' : ''}
            </p>
            {generatedContentInfo.questions > 0 && <p className="text-xs text-green-600">{generatedContentInfo.questions} questions créées.</p>}
            {generatedContentInfo.hasFlashFacts && <p className="text-xs text-green-600">Informations flash également générées.</p>}
            {!generatedContentInfo.hasFlashFacts && generatedContentInfo.questions > 0 && <p className="text-xs text-yellow-600">Aucune information flash pertinente n'a été générée pour ce(s) document(s).</p>}
            {!(generatedContentInfo.hasFlashFacts || generatedContentInfo.questions > 0) && <p className="text-xs text-orange-600">Aucun quiz ni information flash n'a pu être généré.</p>}
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !files || files.length === 0 || !title.trim()}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Traitement et Sauvegarde...' : 'Télécharger et Ajouter à la Bibliothèque'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Note Importante :</p>
            <p className="text-xs">
              La génération et sauvegarde du contenu peut prendre quelques instants. Assurez-vous que le contenu du PDF est clair et le titre est descriptif. Le nouveau contenu sera ajouté à la bibliothèque PDF.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
