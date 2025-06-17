import { PdfUploadForm } from '@/components/admin/PdfUploadForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function AdminUploadPage() {
  return (
    <div className="flex justify-center items-center py-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-2">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-headline">Admin: Upload Document</CardTitle>
          <CardDescription>
            Upload a PDF document to automatically generate a new quiz. This will replace any existing active quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PdfUploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
