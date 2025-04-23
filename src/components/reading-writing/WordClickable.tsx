'use client';

import React, { useState, useEffect } from 'react';
import { WordInteractionModal } from '@/components/features/vocab/WordInteractionModal';
import { api } from '@/utils/trpc';

interface WordClickableProps {
  text: string;
  bankId: string;
}

export function WordClickable({ text, bankId }: WordClickableProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordIdMap, setWordIdMap] = useState<Record<string, string>>({});

  // Split text into words and spaces preserving spaces
  const wordsAndSpaces = text.split(/(\s+)/);

  // Extract unique words (non-whitespace)
  const uniqueWords = Array.from(new Set(wordsAndSpaces.filter(w => w.trim().length > 0)));

  // Fetch word IDs for unique words
  useEffect(() => {
    async function fetchWordIds() {
      const newMap: Record<string, string> = {};
      for (const word of uniqueWords) {
        try {
          const wordData = await api.vocab.getWordByText.query({ text: word, wordBankId: bankId });
          if (wordData?.id) {
            newMap[word] = wordData.id;
          }
        } catch (error) {
          // Word not found or error, skip
        }
      }
      setWordIdMap(newMap);
    }
    fetchWordIds();
  }, [uniqueWords, bankId]);

  return (
    <div className="inline">
      {wordsAndSpaces.map((wordOrSpace, index) => {
        // If it's just whitespace, render as is
        if (/^\s+$/.test(wordOrSpace)) {
          return wordOrSpace;
        }

        const wordId = wordIdMap[wordOrSpace];

        // If no wordId found, render plain text
        if (!wordId) {
          return <span key={index}>{wordOrSpace}</span>;
        }

        // Render each word wrapped with WordInteractionModal trigger
        return (
          <WordInteractionModal key={index} wordId={wordId} bankId={bankId}>
            <button
              type="button"
              onClick={() => setSelectedWord(wordOrSpace)}
              className={`inline px-1 rounded cursor-pointer select-none
                ${selectedWord === wordOrSpace ? 'bg-yellow-200 dark:bg-yellow-600' : 'hover:bg-yellow-100 dark:hover:bg-yellow-700'}
              `}
              aria-pressed={selectedWord === wordOrSpace}
            >
              {wordOrSpace}
            </button>
          </WordInteractionModal>
        );
      })}
    </div>
  );
}