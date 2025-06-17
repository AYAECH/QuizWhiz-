export interface User {
  name: string;
  email: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // This is the correct answer string
}

export interface GeneratedQuiz {
  quiz: QuizQuestion[];
}

export interface QuizAttempt {
  quizDefinition: GeneratedQuiz;
  userAnswers: Record<number, string>; // questionIndex: selectedOptionString
  score: number;
  totalQuestions: number;
  pdfUriUsed?: string; // Optional: URI of the PDF used for this quiz
}

export interface FeedbackItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}
