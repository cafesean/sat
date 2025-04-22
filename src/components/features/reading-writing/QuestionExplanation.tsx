import type { Question } from '../../../types/session-types';

interface QuestionExplanationProps {
  question: Question;
  className?: string;
}

export function QuestionExplanation({ question, className = '' }: QuestionExplanationProps) {
  if (!question.explanation) return null;

  return (
    <div className={`bg-muted p-4 rounded-lg ${className}`}>
      <h4 className="font-semibold mb-2">Explanation</h4>
      <div className="prose prose-sm max-w-none">
        {question.explanation}
      </div>
      
      {question.type === 'multiple-choice' && (
        <div className="mt-4">
          <p className="font-medium">Correct answer: {question.correctAnswer}</p>
        </div>
      )}
    </div>
  );
}