
export interface User {
  id?: string; // Supabase user ID
  name: string;
  email: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; 
}

export interface GeneratedQuiz { // Ce qui est stocké dans localStorage (ACTIVE_QUIZ_DATA_KEY)
  quiz: QuizQuestion[];
  flashFacts?: string[]; 
  sourceTitle?: string; // Pour afficher sur les pages de quiz/flash si besoin
}

export interface QuizAttempt {
  quizDefinition: GeneratedQuiz;
  userAnswers: Record<number, string>; 
  score: number;
  totalQuestions: number;
}

export interface FeedbackItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  studySuggestion?: string;
}

// Nouveau type pour les entrées de la bibliothèque PDF
export interface PdfContentEntry {
  id: string;
  title: string;
  file_sources: string[];
  quiz_data: QuizQuestion[] | null;
  flash_facts_data: string[] | null;
  created_at: string;
}
