
'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, UploadCloud, FileText, AlertTriangle, ListPlus, FileArchive, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const QUIZ_DATA_STORAGE_KEY = 'quizwhiz_active_quiz_data';

export function PdfUploadForm() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [numQuestions, setNumQuestions] = useState<string>("20");
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
        event.target.value = ''; 
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
    if (isNaN(parsedNumQuestions) || parsedNumQuestions < 5 || parsedNumQuestions > 1000) {
      toast({
        title: 'Nombre de Questions Invalide',
        description: 'Veuillez entrer un nombre entre 5 et 1000.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedContentInfo(null);

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
        
      try {
        const contentOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUris, numQuestions: parsedNumQuestions });

        if (contentOutput && contentOutput.quiz && contentOutput.quiz.length > 0) {
          localStorage.setItem(QUIZ_DATA_STORAGE_KEY, JSON.stringify(contentOutput)); 
          
          const fileNames = files.map(f => f.name).join(', ');
          const hasMeaningfulFlashFacts = !!contentOutput.flashFacts && contentOutput.flashFacts.length > 0 && contentOutput.flashFacts.some(fact => fact.trim() !== "" && !fact.toLowerCase().includes("aucune information flash spécifique"));
          
          setGeneratedContentInfo({ 
            title: fileNames, 
            questions: contentOutput.quiz.length,
            hasFlashFacts: hasMeaningfulFlashFacts
          });

          toast({
            title: 'Contenu Généré avec Succès !',
            description: `${contentOutput.quiz.length} questions générées. ${hasMeaningfulFlashFacts ? 'Informations flash également générées.' : 'Aucune information flash pertinente n\'a été générée pour ce(s) document(s).'} À partir de ${files.length} document(s).`,
          });

        } else {
          throw new Error('L\'IA n\'a pas réussi à générer des questions de quiz ou a retourné un quiz vide.');
        }
      } catch (aiError) {
        console.error('Erreur de traitement IA:', aiError);
        toast({
          title: 'Erreur lors de la Génération du Contenu',
          description: (aiError instanceof Error ? aiError.message : String(aiError)) || 'L\'IA n\'a pas pu traiter le(s) PDF. Veuillez essayer d\'autres documents ou vérifier la console.',
          variant: 'destructive',
        });
        localStorage.removeItem(QUIZ_DATA_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Erreur de lecture de fichier ou de soumission de formulaire:', e);
      toast({
        title: 'Échec du Téléchargement',
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
          Sélectionnez un ou plusieurs fichiers PDF pour générer un quiz et des informations flash.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="num-questions" className="text-base">Nombre de Questions</Label>
        <Input
          id="num-questions"
          type="number"
          value={numQuestions}
          onChange={handleNumQuestionsChange}
          min="5"
          max="1000"
          step="1"
          className="w-full"
          aria-describedby="num-questions-help"
          disabled={isLoading}
        />
        <p id="num-questions-help" className="text-sm text-muted-foreground">
          Entrez le nombre de questions souhaité (5-1000).
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
            <p className={`text-sm font-medium ${generatedContentInfo.hasFlashFacts ? 'text-green-700' : 'text-orange-700'}`}>Contenu généré à partir de : {generatedContentInfo.title.length > 50 ? `${generatedContentInfo.title.substring(0,50)}...` : generatedContentInfo.title}</p>
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
        {isLoading ? 'Traitement du/des PDF...' : 'Télécharger et Générer le Contenu'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Note Importante :</p>
            <p className="text-xs">
              La génération de contenu peut prendre quelques instants, surtout pour un grand nombre de questions. Assurez-vous que le contenu du PDF est clair pour de meilleurs résultats. La génération d'informations flash dépend du contenu du document et de l'interprétation de l'IA.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
