
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

export interface GeneratedQuiz { // Ce qui est stocké dans localStorage (ACTIVE_QUIZ_DATA_KEY ou QUIZ_SESSION_KEY)
  quiz: QuizQuestion[];
  flashFacts?: string[]; 
  sourceTitle?: string; // Pour afficher sur les pages de quiz/flash si besoin
  pdfDocId?: string; // Optionnel: ID du document PDF si le quiz en provient
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

// Modifié: PdfContentEntry stocke les métadonnées du PDF et ses data URIs
export interface PdfContentEntry {
  id: string;
  title: string;
  file_sources: string[]; // Noms des fichiers originaux
  pdf_data_uris: string[];  // Contenu des PDF en data URI
  created_at: string;
}
