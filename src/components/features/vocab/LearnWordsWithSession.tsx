'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ChevronLeft, ChevronRight, Loader2, Save, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type WordItem = RouterOutputs['vocab']['listByBank'][number];

interface LearnWordsWithSessionProps {
  words: WordItem[];
  wordBankId: string;
}

export function LearnWordsWithSession({ words, wordBankId }: LearnWordsWithSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState({
    wordsReviewed: 0,
    masteryPercentage: 0,
    nextReviewDate: new Date()
  });
  const [wordList, setWordList] = useState<WordItem[]>(words);
  const utils = api.useUtils();

  // Start practice session on component mount
  const startSessionMutation = api.practice.startPracticeSession.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      toast.success('Practice session started!');
    },
    onError: (error) => {
      toast.error(`Failed to start session: ${error.message}`);
    }
  });

  // End practice session
  const endSessionMutation = api.practice.endPracticeSession.useMutation({
    onSuccess: () => {
      toast.success('Session ended successfully!');
      setSessionId(null);
    },
    onError: (error) => {
      toast.error(`Failed to end session: ${error.message}`);
    }
  });

  // Get more words when needed
  const getMoreWordsQuery = api.practice.getPrioritizedWords.useQuery(
    { wordBankId, sessionId: sessionId || undefined, limit: 10 },
    { enabled: false } // Disable auto-fetching
  );

  
    const fetchMoreWords = async () => {
      const { data: newWords } = await getMoreWordsQuery.refetch();
      if (newWords) {
        setWordList(prevWords => {
          // Filter out duplicates by id
          const existingIds = new Set(prevWords.map(w => w.id));
          const filteredNewWords = newWords.filter(w => !existingIds.has(w.id));
          // Ensure all required fields exist on new words for type safety
          const normalizedNewWords = filteredNewWords.map(w => ({
            ...w,
            practiceCount: (w as any).practiceCount ?? 0,
            wordBank: (w as any).wordBank ?? { id: '' },
            _count: (w as any)._count ?? { practiceLogs: 0 },
          }));
          return [...prevWords, ...normalizedNewWords];
        });
      }
    };
  const rateWordMutation = api.vocab.rateWord.useMutation({
    onSuccess: () => {
      toast.success('Rating recorded!');
      setSessionMetrics(prev => ({
        ...prev,
        wordsReviewed: prev.wordsReviewed + 1
      }));
      handleNext();
    },
    onError: (error) => {
      toast.error(`Failed to record rating: ${error.message}`);
    }
  });

  const handleWordRating = (ease: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentWord || !sessionId) return;
    const easeMap = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };
    rateWordMutation.mutate({
      wordId: currentWord.id,
      ease: easeMap[ease],
      sessionId: sessionId
    });
  };

  const currentWord = words[currentIndex];

  const userSession = useSession();

  useEffect(() => {
    // Initialize session when component mounts
    if (!sessionId) {
      const userId = userSession.data?.user?.id;
      if (userId) {
        startSessionMutation.mutate({ 
          wordBankId,
          userId
        });
      } else {
        toast.error('User not authenticated');
      }
    }
  }, [sessionId, wordBankId, userSession]);

  useEffect(() => {
    const initialNote = currentWord?.notes || '';
    setNote(initialNote);
    setIsNoteSaved(true);
    setShowDetails(false);
  }, [currentWord]);

  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: (updatedWord) => {
      toast.success('Note saved!');
      setIsNoteSaved(true);
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    }
  });

  const handleNext = async () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fetch more words when we reach the end
      await fetchMoreWords();
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

  const handleEndSession = () => {
    if (sessionId) {
      endSessionMutation.mutate({ sessionId });
    }
  };

  if (!currentWord) {
    return <p className="text-center text-muted-foreground">No words available in this bank.</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Mastery: {sessionMetrics.masteryPercentage}% | 
          Next Review: {sessionMetrics.nextReviewDate.toLocaleDateString()}
        </div>
        <Button 
          variant="ghost" 
          onClick={handleEndSession}
          disabled={endSessionMutation.isPending}
        >
          {endSessionMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          End Session
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-semibold">
            {currentWord.wordMaster?.baseWord || currentWord.text}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {showDetails ? (
            <div className="space-y-2 text-base text-center">
              <p><strong>Type:</strong> {currentWord.wordMaster?.wordType || 'N/A'}</p>
              <p><strong>Definition:</strong> {currentWord.wordMaster?.definition || 'N/A'}</p>
              <p><strong>Sample Sentence:</strong> {(currentWord.wordMaster?.sampleSentences as any)?.default || 'N/A'}</p>
              <p><strong>Translation:</strong> {(currentWord.wordMaster?.translations as any)?.default || 'N/A'}</p>
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-[100px]">
              <Button onClick={() => setShowDetails(true)}>Show Details</Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-center gap-2 w-full">
            <Button variant="destructive" onClick={() => handleWordRating('AGAIN')}>Again</Button>
            <Button variant="outline" onClick={() => handleWordRating('HARD')}>Hard</Button>
            <Button variant="default" onClick={() => handleWordRating('GOOD')}>Good</Button>
            <Button variant="default" onClick={() => handleWordRating('EASY')}>Easy</Button>
          </div>
          <div className="w-full space-y-2">
            <label htmlFor={`notes-${currentWord.id}`} className="text-sm font-medium text-muted-foreground">My Notes</label>
            <Textarea
              id={`notes-${currentWord.id}`}
              placeholder="Add your personal notes here..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setIsNoteSaved(false);
              }}
              rows={3}
              className="w-full"
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