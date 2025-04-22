import { useState } from 'react';
import type { AnswerAttempt, Question } from '../../../types/session-types';

interface AnswerSubmissionProps {
  question: Question;
  onSubmit: (attempt: Omit<AnswerAttempt, 'id' | 'timestamp'>) => void;
  disabled?: boolean;
}

export function AnswerSubmission({ question, onSubmit, disabled }: AnswerSubmissionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    const correct = selectedAnswer === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    onSubmit({
      practiceSessionId: '', // Will be filled by parent
      questionId: question.id,
      userId: '', // Will be filled by parent
      selectedAnswer,
      isCorrect: correct
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{question.questionText}</h3>
      
      {question.type === 'multiple-choice' ? (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center">
              <input
                type="radio"
                id={`option-${i}`}
                name="answer"
                value={option}
                checked={selectedAnswer === option}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={disabled}
                className="mr-2"
              />
              <label htmlFor={`option-${i}`}>{option}</label>
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={selectedAnswer}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          disabled={disabled}
          className="w-full p-2 border rounded"
          rows={4}
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled || !selectedAnswer}
        className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        Submit Answer
      </button>

      {showFeedback && (
        <div className={`p-4 rounded ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className="font-medium">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          {question.explanation && (
            <p className="mt-2">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}