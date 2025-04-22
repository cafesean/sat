import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import type { WordMaster } from '../../../types/prisma-types';

interface WordHighlighterProps {
  text: string;
  onAddToWordBank?: (word: string) => Promise<void>;
  onLookupWord?: (word: string) => Promise<WordMaster | null>;
}

export function WordHighlighter({ text, onAddToWordBank, onLookupWord }: WordHighlighterProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<WordMaster | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleWordClick = async (word: string) => {
    setSelectedWord(word);
    setIsLoading(true);
    
    try {
      if (onLookupWord) {
        const info = await onLookupWord(word);
        setWordInfo(info);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to lookup word',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWordBank = async () => {
    if (!selectedWord || !onAddToWordBank) return;
    
    try {
      await onAddToWordBank(selectedWord);
      toast({
        title: 'Success',
        description: `Added "${selectedWord}" to your word bank`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add word to word bank',
        variant: 'destructive',
      });
    }
  };

  // Split text into words and non-words (punctuation, spaces)
  const words = text.split(/(\W+)/);

  return (
    <div className="space-y-4">
      <div className="prose max-w-none">
        {words.map((part, i) => {
          if (/\w+/.test(part)) {
            return (
              <span
                key={i}
                onClick={() => handleWordClick(part)}
                className={`cursor-pointer hover:bg-yellow-100 ${
                  selectedWord === part ? 'bg-yellow-200 font-medium' : ''
                }`}
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {selectedWord && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{selectedWord}</h3>
            {onAddToWordBank && (
              <button
                onClick={handleAddToWordBank}
                disabled={isLoading}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                Add to Word Bank
              </button>
            )}
          </div>

          {isLoading ? (
            <p>Loading word info...</p>
          ) : wordInfo ? (
            <div>
              <p className="font-medium">{wordInfo.definition}</p>
              {wordInfo.sampleSentences && (
                <div className="mt-2">
                  <h4 className="font-medium">Example Sentences:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {Array.isArray(wordInfo.sampleSentences) ? (
                      wordInfo.sampleSentences.map((sentence, i) => (
                        <li key={i}>{sentence}</li>
                      ))
                    ) : (
                      Object.values(wordInfo.sampleSentences).map((sentence, i) => (
                        <li key={i}>{sentence}</li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p>No word information available</p>
          )}
        </div>
      )}
    </div>
  );
}