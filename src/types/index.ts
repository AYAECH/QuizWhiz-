
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
  flashInformation?: string; 
}

export interface QuizAttempt {
  quizDefinition: GeneratedQuiz;
  userAnswers: Record<number, string>; // questionIndex: selectedOptionString
  score: number;
  totalQuestions: number;
}

export interface FeedbackItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}
