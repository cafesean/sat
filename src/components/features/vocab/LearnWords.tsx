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
  const utils = api.useUtils();

  const currentWord = words[currentIndex];

  // Effect to update note when currentWord changes
  useEffect(() => {
    setNote(currentWord?.notes || '');
    setShowDetails(false); // Reset showDetails when word changes
  }, [currentWord]);


  // Mutation to save notes
  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: (updatedWord) => {
      toast.success('Note saved!');
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
          <CardTitle className="text-center text-3xl font-semibold">{currentWord.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {showDetails ? (
            <div className="space-y-2 text-sm text-center">
              <p><strong>Type:</strong> {currentWord.wordType || 'N/A'}</p>
              <p><strong>Definition:</strong> {currentWord.definition || 'N/A'}</p>
              <p><strong>Sample Sentence:</strong> {currentWord.sampleSentence || 'N/A'}</p>
              <p><strong>Translation:</strong> {currentWord.translation || 'N/A'}</p>
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-[100px]">
              <Button onClick={() => setShowDetails(true)}>Show Details</Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
           {/* Notes Section */}
           <div className="w-full space-y-2">
             <label htmlFor={`notes-${currentWord.id}`} className="text-sm font-medium text-muted-foreground">My Notes</label>
             <Textarea
               id={`notes-${currentWord.id}`}
               placeholder="Add your personal notes here..."
               value={note}
               onChange={(e) => setNote(e.target.value)}
               rows={3}
               className="w-full"
             />
             <Button
               size="sm"
               onClick={handleSaveNote}
               disabled={saveNoteMutation.isPending || note === (currentWord.notes || '')}
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
