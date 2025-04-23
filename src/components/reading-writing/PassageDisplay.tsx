import React from 'react';

interface PassageDisplayProps {
  text: string;
}

const PassageDisplay: React.FC<PassageDisplayProps> = ({ text }) => {
  return (
    <div className="p-4 border rounded bg-white max-h-64 overflow-y-auto">
      <p className="whitespace-pre-wrap text-gray-800">{text}</p>
    </div>
  );
};

export default PassageDisplay;