
'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, UploadCloud, FileText, AlertTriangle, ListPlus, FileArchive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const QUIZ_DATA_STORAGE_KEY = 'quizwhiz_active_quiz_data';

export function PdfUploadForm() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [numQuestions, setNumQuestions] = useState<string>("20");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuizInfo, setGeneratedQuizInfo] = useState<{ title: string; questions: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      const allPdfs = selectedFiles.every(file => file.type === 'application/pdf');
      
      if (!allPdfs) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select only PDF files.',
          variant: 'destructive',
        });
        setFiles(null);
        event.target.value = ''; 
        return;
      }
      setFiles(selectedFiles);
      setGeneratedQuizInfo(null); 
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
        title: 'No Files Selected',
        description: 'Please select one or more PDF files to upload.',
        variant: 'destructive',
      });
      return;
    }

    const parsedNumQuestions = parseInt(numQuestions, 10);
    if (isNaN(parsedNumQuestions) || parsedNumQuestions < 5 || parsedNumQuestions > 1000) {
      toast({
        title: 'Invalid Number of Questions',
        description: 'Please enter a number between 5 and 1000.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedQuizInfo(null);

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
        const quizOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUris, numQuestions: parsedNumQuestions });

        if (quizOutput && quizOutput.quiz && quizOutput.quiz.length > 0) {
          localStorage.setItem(QUIZ_DATA_STORAGE_KEY, JSON.stringify(quizOutput));
          
          const fileNames = files.map(f => f.name).join(', ');
          setGeneratedQuizInfo({ title: fileNames, questions: quizOutput.quiz.length });
          toast({
            title: 'Quiz Generated Successfully!',
            description: `${quizOutput.quiz.length} questions were generated from ${files.length} document(s).`,
          });
        } else {
          throw new Error('AI failed to generate quiz questions or returned an empty quiz.');
        }
      } catch (aiError) {
        console.error('AI processing error:', aiError);
        toast({
          title: 'Error Generating Quiz',
          description: (aiError instanceof Error ? aiError.message : String(aiError)) || 'The AI failed to process the PDF(s). Please try other document(s) or check the console.',
          variant: 'destructive',
        });
        localStorage.removeItem(QUIZ_DATA_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    } catch (e) {
      console.error('File reading or form submission error:', e);
      toast({
        title: 'Upload Failed',
        description: (e instanceof Error ? e.message : String(e)) || 'An unexpected error occurred while reading files.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload" className="text-base">Upload PDF Document(s)</Label>
        <Input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          multiple // Allow multiple files
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          aria-describedby="file-upload-help"
          disabled={isLoading}
        />
        <p id="file-upload-help" className="text-sm text-muted-foreground">
          Select one or more PDF files to generate a quiz.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="num-questions" className="text-base">Number of Questions</Label>
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
          Enter the desired number of questions (5-1000).
        </p>
      </div>

      {files && files.length > 0 && !generatedQuizInfo && (
        <Card className="border-dashed border-primary bg-primary/5">
          <CardContent className="p-4 text-center">
            {files.length === 1 ? <FileText className="mx-auto h-10 w-10 text-primary mb-2" /> : <FileArchive className="mx-auto h-10 w-10 text-primary mb-2" />}
            <p className="text-sm font-medium text-primary">Selected file(s): {files.map(f => f.name).join(', ')}</p>
            <p className="text-xs text-muted-foreground">Total size: {(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(2)} KB</p>
          </CardContent>
        </Card>
      )}
      
      {generatedQuizInfo && (
         <Card className="bg-green-50 border-green-500">
          <CardContent className="p-4 text-center">
            <ListPlus className="mx-auto h-10 w-10 text-green-700 mb-2" />
            <p className="text-sm font-medium text-green-700">Quiz generated from: {generatedQuizInfo.title.length > 50 ? `${generatedQuizInfo.title.substring(0,50)}...` : generatedQuizInfo.title}</p>
            <p className="text-xs text-green-600">{generatedQuizInfo.questions} questions created.</p>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !files || files.length === 0}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Processing PDF(s)...' : 'Upload and Generate Quiz'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Important Note:</p>
            <p className="text-xs">
              Quiz generation may take a few moments, especially for a large number of questions. Ensure PDF content is clear for best results.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
