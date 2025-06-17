import { QuizClientPage } from '@/components/quiz/QuizClientPage';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// This page will use a client component that reads from localStorage.
// No server-side data fetching is directly done here for the quiz itself.
export default function QuizPlayPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <QuizClientPage />
    </Suspense>
  );
}
