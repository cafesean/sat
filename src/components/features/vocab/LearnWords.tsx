'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'; // Added navigation icons
import { useEffect, useState } from 'react'; // Import useEffect
import { toast } from 'sonner';

type WordItem = RouterOutputs['vocab']['listByBank'][number];

interface LearnWordsProps {
  words: WordItem[];
}

export function LearnWords({ words }: LearnWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState(''); // Initialize empty
  const [isNoteSaved, setIsNoteSaved] = useState(true); // Track if the current note state is saved
  const utils = api.useUtils();

  const rateWordMutation = api.vocab.rateWord.useMutation({
    onSuccess: () => {
      toast.success('Rating recorded!');
      handleNext();
    },
    onError: (error) => {
      toast.error(`Failed to record rating: ${error.message}`);
    }
  });

  const handleWordRating = (ease: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentWord) return;
    const easeMap = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };
    rateWordMutation.mutate({
      wordId: currentWord.id,
      ease: easeMap[ease]
    });
  };

  const currentWord = words[currentIndex];

  // Effect to update note when currentWord changes
  useEffect(() => {
    const initialNote = currentWord?.notes || '';
    setNote(initialNote);
    setIsNoteSaved(true); // Reset saved state when word changes
    setShowDetails(false); // Reset showDetails when word changes
  }, [currentWord]);


  // Mutation to save notes
  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: (updatedWord) => {
      toast.success('Note saved!');
      setIsNoteSaved(true); // Mark as saved after successful mutation
      // Optimistically update the local words array
      const updatedWords = words.map(w =>
        w.id === updatedWord.id ? { ...w, notes: updatedWord.notes } : w
      );
      // Note: This local update won't persist if the parent component re-renders without refetching.
      // Consider invalidating the listByBank query if persistence across re-renders is crucial.
      // utils.vocab.listByBank.invalidate({ wordBankId: currentWord.wordBankId });
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSaveNote = () => {
    if (!currentWord) return;
    saveNoteMutation.mutate({ wordId: currentWord.id, notes: note });
  };

  if (!currentWord) {
    return <p className="text-center text-muted-foreground">No words available in this bank.</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* Display baseWord from wordMaster, fallback to text if needed */}
          <CardTitle className="text-center text-3xl font-semibold">{currentWord.wordMaster?.baseWord || currentWord.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {showDetails ? (
            <div className="space-y-2 text-base text-center">
              <p><strong>Type:</strong> {currentWord.wordMaster?.wordType || 'N/A'}</p>
              <p><strong>Definition:</strong> {currentWord.wordMaster?.definition || 'N/A'}</p>
              {/* Assuming 'default' key for sample sentence */}
              <p><strong>Sample Sentence:</strong> {(currentWord.wordMaster?.sampleSentences as any)?.default || 'N/A'}</p>
              {/* Assuming 'default' key for translation */}
              <p><strong>Translation:</strong> {(currentWord.wordMaster?.translations as any)?.default || 'N/A'}</p>
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-[100px]">
              <Button onClick={() => setShowDetails(true)}>Show Details</Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {/* Rating Buttons */}
          <div className="flex flex-wrap justify-center gap-2 w-full">
            <Button variant="destructive" onClick={() => handleWordRating('AGAIN')}>Again</Button>
            <Button variant="secondary" onClick={() => handleWordRating('HARD')}>Hard</Button>
            <Button variant="secondary" onClick={() => handleWordRating('GOOD')}>Good</Button>
            <Button variant="default" onClick={() => handleWordRating('EASY')}>Easy</Button>
          </div>
          {/* Notes Section */}
          <div className="w-full space-y-2">
            <label htmlFor={`notes-${currentWord.id}`} className="text-sm font-medium text-muted-foreground">My Notes</label>
            <Textarea
              id={`notes-${currentWord.id}`}
              placeholder="Add your personal notes here..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setIsNoteSaved(false); // Mark as unsaved when text changes
              }}
              rows={3}
              className={`w-full`}
            />
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={saveNoteMutation.isPending || isNoteSaved}
              className="w-full"
            >
              {saveNoteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Note
            </Button>
          </div>
          {/* Navigation */}
          <div className="flex justify-between w-full">
            <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </span>
            <Button onClick={handleNext} disabled={currentIndex === words.length - 1} variant="outline">
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
