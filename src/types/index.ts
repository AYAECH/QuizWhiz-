
export interface User {
  name: string;
  email: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; 
}

export interface GeneratedQuiz {
  quiz: QuizQuestion[];
  flashFacts?: string[]; 
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
}
