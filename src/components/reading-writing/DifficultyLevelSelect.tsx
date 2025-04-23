import React from 'react';

interface DifficultyLevelSelectProps {
  levels: string[];
  selected: string;
  onSelect: (level: string) => void;
}

const DifficultyLevelSelect: React.FC<DifficultyLevelSelectProps> = ({
  levels,
  selected,
  onSelect,
}) => {
  return (
    <div className="flex space-x-2">
      {levels.map((level) => (
        <button
          key={level}
          onClick={() => onSelect(level)}
          className={`px-4 py-2 rounded ${
            selected === level ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  );
};

export default DifficultyLevelSelect;