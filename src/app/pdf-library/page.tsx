
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, AlertTriangle, Home, Library, FileText, PlayCircle, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PdfContentEntry } from '@/types'; // PdfContentEntry type might need update
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PdfLibraryPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [pdfEntries, setPdfEntries] = useState<PdfContentEntry[]>([]); // Changed from pdfContents
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PdfContentEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchPdfEntries = async () => {
    setIsLoadingData(true);
    if (!supabase) {
      toast({ title: 'Erreur Supabase', description: 'Client Supabase non initialisé.', variant: 'destructive' });
      setIsLoadingData(false);
      return;
    }
    try {
      // Select only necessary fields, pdf_data_uris is not needed for listing
      const { data, error } = await supabase
        .from('pdf_generated_content')
        .select('id, title, file_sources, created_at') 
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setPdfEntries(data as Omit<PdfContentEntry, 'pdf_data_uris'>[] || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des entrées PDF:', error);
      toast({
        title: 'Erreur de Chargement',
        description: error.message || 'Impossible de charger la bibliothèque PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isClient || userLoading) return;

    if (!user) {
      if (!userLoading) {
        toast({ title: 'Authentification Requise', description: 'Veuillez vous connecter pour voir la bibliothèque PDF.', variant: 'destructive' });
        router.push('/register');
      }
      return;
    }
    fetchPdfEntries();
  }, [isClient, user, userLoading, router, toast]);

  const handleConfigureQuiz = (pdfId: string) => {
    router.push(`/quiz/configure-pdf/${pdfId}`);
  };

  const openDeleteConfirmation = (entry: PdfContentEntry) => {
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const handleDeletePdfEntry = async () => {
    if (!entryToDelete || !supabase) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('pdf_generated_content')
        .delete()
        .eq('id', entryToDelete.id);

      if (error) {
        throw error;
      }
      toast({ title: 'Document PDF Supprimé', description: `"${entryToDelete.title}" a été supprimé de la bibliothèque.` });
      setPdfEntries(prevEntries => prevEntries.filter(e => e.id !== entryToDelete.id));
    } catch (error: any) {
      console.error('Erreur lors de la suppression du document PDF:', error);
      toast({
        title: 'Échec de la Suppression',
        description: error.message || 'Impossible de supprimer le document.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setEntryToDelete(null);
    }
  };

  if (!isClient || userLoading || (isLoadingData && pdfEntries.length === 0 && !user)) {
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
          <CardTitle className="text-3xl">Bibliothèque de Documents PDF</CardTitle>
          <CardDescription>Parcourez les documents PDF téléchargés et générez des quiz à la demande.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingData && pdfEntries.length === 0 ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Chargement des documents...</p>
            </div>
          ) : !isLoadingData && pdfEntries.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Aucun document PDF trouvé.</p>
                <p className="text-sm text-muted-foreground">Un administrateur doit <Link href="/admin/upload" className="underline hover:text-primary">télécharger des documents</Link> pour les lister ici.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pdfEntries.map((entry) => (
                <Card key={entry.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl text-primary">{entry.title}</CardTitle>
                            <div className="flex items-center text-xs text-muted-foreground pt-1">
                            <FileText className="h-4 w-4 mr-1.5" />
                            <span className="truncate max-w-xs sm:max-w-md md:max-w-lg">
                                Source(s): {entry.file_sources.join(', ')}
                            </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                            Ajouté le: {format(new Date(entry.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(entry as PdfContentEntry)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-5 w-5" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Générez un quiz personnalisé à partir de ce document.
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
                    <Button
                      onClick={() => handleConfigureQuiz(entry.id)}
                      className="w-full sm:w-auto"
                    >
                      <Settings2 className="mr-2 h-4 w-4" /> Configurer et Générer un Quiz
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

      {entryToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la Suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le document PDF intitulé "{entryToDelete.title}" ? Cette action est irréversible et supprimera les fichiers associés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePdfEntry} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
