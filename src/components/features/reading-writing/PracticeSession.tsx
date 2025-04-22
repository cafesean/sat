import { useState } from 'react';
import type { Passage, QuestionSet } from '../../../types/session-types';

interface PracticeSessionProps {
  mode: 'passage' | 'question-set';
  initialContent: Passage | QuestionSet;
}

export function PracticeSession({ mode, initialContent }: PracticeSessionProps) {
  const [content, setContent] = useState(initialContent);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {mode === 'passage' ? (
        <div className="prose max-w-none">
          <h2 className="text-2xl font-bold mb-4">Passage</h2>
          <p className="whitespace-pre-line">{(content as Passage).content}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">{(content as QuestionSet).title}</h2>
          <p className="mb-4">Question {currentQuestionIndex + 1} of {(content as QuestionSet).questions.length}</p>
        </div>
      )}
    </div>
  );
}