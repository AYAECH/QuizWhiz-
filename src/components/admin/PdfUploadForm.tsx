'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuizFromPdf, type GenerateQuizFromPdfOutput } from '@/ai/flows/generate-quiz-from-pdf';
import { Loader2, UploadCloud, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// const PDF_STORAGE_KEY = 'quizwhiz_active_pdf_uri'; // No longer storing full PDF URI
const QUIZ_DATA_STORAGE_KEY = 'quizwhiz_active_quiz_data'; // To store the generated quiz from this PDF

export function PdfUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuizInfo, setGeneratedQuizInfo] = useState<{ title: string; questions: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a PDF file.',
          variant: 'destructive',
        });
        setFile(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setFile(selectedFile);
      setGeneratedQuizInfo(null); // Clear previous quiz info
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a PDF file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedQuizInfo(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const pdfDataUri = reader.result as string;
        
        try {
          // localStorage.setItem(PDF_STORAGE_KEY, pdfDataUri); // Store PDF URI - REMOVED due to quota limits
          
          const quizOutput: GenerateQuizFromPdfOutput = await generateQuizFromPdf({ pdfDataUri });

          if (quizOutput && quizOutput.quiz && quizOutput.quiz.length > 0) {
            localStorage.setItem(QUIZ_DATA_STORAGE_KEY, JSON.stringify(quizOutput)); // Store generated quiz data
            
            setGeneratedQuizInfo({ title: file.name, questions: quizOutput.quiz.length });
            toast({
              title: 'Quiz Generated Successfully!',
              description: `${quizOutput.quiz.length} questions were generated from ${file.name}.`,
            });
          } else {
            throw new Error('AI failed to generate quiz questions or returned an empty quiz.');
          }
        } catch (aiError) {
          console.error('AI processing error:', aiError);
          toast({
            title: 'Error Generating Quiz',
            description: (aiError instanceof Error ? aiError.message : String(aiError)) || 'The AI failed to process the PDF. Please try another document or check the console.',
            variant: 'destructive',
          });
          // Clear stored quiz data if AI fails
          // localStorage.removeItem(PDF_STORAGE_KEY); // REMOVED
          localStorage.removeItem(QUIZ_DATA_STORAGE_KEY);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        toast({
          title: 'File Reading Error',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
    } catch (e) {
      console.error('Form submission error:', e);
      toast({
        title: 'Upload Failed',
        description: (e instanceof Error ? e.message : String(e)) || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-upload" className="text-base">Upload PDF Document</Label>
        <Input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          aria-describedby="file-upload-help"
          disabled={isLoading}
        />
        <p id="file-upload-help" className="text-sm text-muted-foreground">
          Select a PDF file (e.g., training material, guidelines) to generate a quiz.
        </p>
      </div>

      {file && !generatedQuizInfo && (
        <Card className="border-dashed border-primary bg-primary/5">
          <CardContent className="p-4 text-center">
            <FileText className="mx-auto h-10 w-10 text-primary mb-2" />
            <p className="text-sm font-medium text-primary">Selected file: {file.name}</p>
            <p className="text-xs text-muted-foreground">Size: {(file.size / 1024).toFixed(2)} KB</p>
          </CardContent>
        </Card>
      )}
      
      {generatedQuizInfo && (
         <Card className="bg-green-50 border-green-500">
          <CardContent className="p-4 text-center">
            <FileText className="mx-auto h-10 w-10 text-green-700 mb-2" />
            <p className="text-sm font-medium text-green-700">Quiz generated from: {generatedQuizInfo.title}</p>
            <p className="text-xs text-green-600">{generatedQuizInfo.questions} questions created.</p>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !file}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Processing PDF...' : 'Upload and Generate Quiz'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Important Note:</p>
            <p className="text-xs">
              Quiz generation may take a few moments depending on the PDF size and complexity.
              Ensure the PDF content is clear and well-structured for best results.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
