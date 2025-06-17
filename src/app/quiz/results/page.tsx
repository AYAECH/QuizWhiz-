import { QuizResultsClientPage } from '@/components/quiz/QuizResultsClientPage';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// This page will use a client component that reads from localStorage.
export default function QuizResultsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <QuizResultsClientPage />
    </Suspense>
  );
}
