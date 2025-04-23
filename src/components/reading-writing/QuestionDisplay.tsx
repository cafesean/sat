import React from 'react';

interface Question {
  id: string; // Or number, depending on the actual data structure
  text: string;
}

interface QuestionDisplayProps {
  questions: Question[];
}


const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ questions }) => {
  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="p-3 border rounded bg-white">
          <span className="font-semibold">Q. </span>
          <span className="text-gray-800">{q.text}</span>
        </div>
      ))}
    </div>
  );
};

export default QuestionDisplay;