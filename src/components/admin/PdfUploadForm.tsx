
'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, FileText, AlertTriangle, FileArchive, Info, AlertCircle, BookText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';

export function PdfUploadForm() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<{ title: string; fileNames: string[] } | null>(null);
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
      setUploadSuccessInfo(null); 
    } else {
      setFiles(null);
    }
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
        description: 'Veuillez donner un titre à ce lot de documents PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setUploadSuccessInfo(null);

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
        
      const { error: insertError } = await supabase
        .from('pdf_generated_content')
        .insert({
          title: title.trim(),
          file_sources: fileNamesArray,
          pdf_data_uris: pdfDataUris, // Stocker les data URIs
        });
      
      if (insertError) {
        console.error('Erreur lors de l\'insertion des métadonnées PDF:', insertError);
        throw new Error('Impossible de sauvegarder les documents PDF. Détails: ' + insertError.message);
      }
      
      setUploadSuccessInfo({ 
        title: title.trim(), 
        fileNames: fileNamesArray
      });

      toast({
        title: 'Documents PDF Ajoutés !',
        description: `Le lot "${title.trim()}" a été ajouté à la bibliothèque. Les quiz seront générés à la demande.`,
      });
      
      setFiles(null);
      setTitle("");
      const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error) { 
      console.error('Erreur lors du téléchargement ou de la sauvegarde des PDF:', error);
      setUploadSuccessInfo(null);
      toast({
        title: 'Échec du Téléchargement',
        description: (error instanceof Error ? error.message : String(error)) || 'Une erreur est survenue lors de la sauvegarde des documents.',
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pdf-title" className="text-base">Titre du Lot de PDF</Label>
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
          Donnez un nom descriptif à ce lot de PDF.
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
          Sélectionnez un ou plusieurs fichiers PDF. Ils seront ajoutés à la bibliothèque.
        </p>
      </div>

      {files && files.length > 0 && !uploadSuccessInfo && (
        <Card className="border-dashed border-primary bg-primary/5">
          <CardContent className="p-4 text-center">
            {files.length === 1 ? <FileText className="mx-auto h-10 w-10 text-primary mb-2" /> : <FileArchive className="mx-auto h-10 w-10 text-primary mb-2" />}
            <p className="text-sm font-medium text-primary">Fichier(s) sélectionné(s) : {files.map(f => f.name).join(', ')}</p>
            <p className="text-xs text-muted-foreground">Taille totale : {(files.reduce((acc, f) => acc + f.size, 0) / (1024*1024)).toFixed(2)} MB</p>
          </CardContent>
        </Card>
      )}
      
      {uploadSuccessInfo && (
         <Card className="bg-green-50 border-green-500">
          <CardContent className="p-4 text-center space-y-1">
             <div className="flex justify-center items-center gap-2">
                 <BookText className='h-8 w-8 text-green-700' />
            </div>
            <p className="text-sm font-medium text-green-700">
              Lot de PDF "{uploadSuccessInfo.title.length > 50 ? `${uploadSuccessInfo.title.substring(0,50)}...` : uploadSuccessInfo.title}" ajouté avec succès.
            </p>
            <p className="text-xs text-green-600">
              Fichiers: {uploadSuccessInfo.fileNames.join(', ').substring(0, 70)}{uploadSuccessInfo.fileNames.join(', ').length > 70 ? '...' : ''}
            </p>
            <p className="text-xs text-green-600">Retrouvez-le dans la Bibliothèque PDF pour générer un quiz.</p>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !files || files.length === 0 || !title.trim()}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Sauvegarde en cours...' : 'Ajouter à la Bibliothèque PDF'}
      </Button>
      
      <Card className="mt-4 bg-yellow-50 border-yellow-400 text-yellow-700">
        <CardContent className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Note Importante :</p>
            <p className="text-xs">
              Le téléchargement et la sauvegarde des PDF peuvent prendre quelques instants, surtout pour les fichiers volumineux. 
              Les quiz et informations flash seront générés à la demande depuis la bibliothèque.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
