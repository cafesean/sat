// Session status constants for NextAuth
export enum SessionStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated'
}

export enum PracticeType {
  PASSAGE = 'passage',
  QUESTION_SET = 'question-set'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  FREE_RESPONSE = 'free-response'
}

export interface Passage {
  id: string;
  content: string;
  difficultyId: string;
  createdAt: Date;
  practiceSessionId: string;
  questions: Question[];
}

export interface QuestionSet {
  id: string;
  title: string;
  description?: string;
  difficultyId: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  creatorId: string;
  questions: Question[];
}

export interface Question {
  id: string;
  passageId?: string;
  questionSetId?: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  createdAt: Date;
}

export interface AnswerAttempt {
  id: string;
  practiceSessionId: string;
  questionId: string;
  userId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timestamp: Date;
}

export interface QuestionChat {
  id: string;
  questionId: string;
  userId: string;
  message: string;
  isAi: boolean;
  createdAt: Date;
}