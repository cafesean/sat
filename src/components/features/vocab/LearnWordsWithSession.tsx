'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api, type RouterOutputs } from '@/utils/trpc';
import { Loader2, Save, Star, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
// @ts-ignore - Handling type error
import type { TRPCClientErrorLike } from '@trpc/client';

type WordItem = RouterOutputs['vocab']['listByBank'][number];

interface LearnWordsWithSessionProps {
  words: WordItem[];
  wordBankId: string;
}

export function LearnWordsWithSession({ words, wordBankId }: LearnWordsWithSessionProps) {
  // Current active word
  const [currentWord, setCurrentWord] = useState<WordItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState({
    wordsReviewed: 0,
  });
  
  // Queue of words to show based on SRS priority
  const [wordQueue, setWordQueue] = useState<WordItem[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  
  const utils = api.useUtils();
  const userSession = useSession();

  // Start practice session on component mount
  // @ts-ignore - Ignoring type issues related to practice router
  const startSessionMutation = api.practice.startPracticeSession.useMutation({
    onSuccess: (session: { id: string }) => {
      setSessionId(session.id);
      toast.success('Practice session started!');
      
      // Initialize with the words we already have
      if (words.length > 0) {
        // Sort by SRS priority (this is a simplified version - your actual priority logic may differ)
        const sortedWords = [...words].sort((a, b) => {
          // Priority factors - adjust based on your SRS implementation
          // 1. Lowest interval first
          // 2. Starred words prioritized
          // 3. Earlier due dates first
          
          // Interval comparison (lower is higher priority)
          if (a.interval !== b.interval) return a.interval - b.interval;
          
          // Star status (starred is higher priority)
          if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
          
          // Next review date (earlier is higher priority)
          return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
        });
        
        setWordQueue(sortedWords);
        setCurrentWord(sortedWords[0]);
      } else {
        // Fetch words if we have none
        fetchMoreWords();
      }
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(`Failed to start session: ${error.message}`);
    }
  });

  // End practice session
  // @ts-ignore - Ignoring type issues related to practice router
  const endSessionMutation = api.practice.endPracticeSession.useMutation({
    onSuccess: () => {
      toast.success('Session ended successfully!');
      setSessionId(null);
      setCurrentWord(null);
      setWordQueue([]);
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(`Failed to end session: ${error.message}`);
    }
  });

  // Get more words when needed - this should fetch based on SRS priority
  // @ts-ignore - Ignoring type issues related to practice router
  const getMoreWordsQuery = api.practice.getPrioritizedWords.useQuery(
    { 
      wordBankId, 
      sessionId: sessionId || undefined, 
      limit: 50, // Get more words at once to reduce API calls
    },
    { enabled: false } // We'll trigger this manually
  );
  
  // Function to fetch more words and update the queue
  const fetchMoreWords = async () => {
    setIsLoading(true);
    try {
      const { data: newWords } = await getMoreWordsQuery.refetch();
      
      if (newWords && newWords.length > 0) {
        // Filter out duplicates that are already in the queue
        const existingIds = new Set(wordQueue.map((w: WordItem) => w.id));
        const filteredNewWords = newWords.filter((w: WordItem) => !existingIds.has(w.id));
        
        // Ensure all required fields exist on new words for type safety
        const normalizedNewWords = filteredNewWords.map((w: WordItem) => ({
          ...w,
          practiceCount: (w as any).practiceCount ?? 0,
          wordBank: (w as any).wordBank ?? { id: '' },
          _count: (w as any)._count ?? { practiceLogs: 0 },
        }));
        
        // Add to queue
        setWordQueue(prev => [...prev, ...normalizedNewWords]);
        
        // Set current word if none is active
        if (!currentWord && normalizedNewWords.length > 0) {
          setCurrentWord(normalizedNewWords[0]);
        }
      } else if (wordQueue.length === 0) {
        // If no words were returned and the queue is empty, show a message
        toast.info("No words available for practice right now.");
      }
    } catch (err) {
      toast.error("Failed to fetch words for practice.");
    } finally {
      setIsLoading(false);
    }
  };

  // Record word rating and update SRS data
  const rateWordMutation = api.vocab.rateWordReviewCount.useMutation({
    onSuccess: () => {
      // Increment stats
      setSessionMetrics(prev => ({
        ...prev,
        wordsReviewed: prev.wordsReviewed + 1
      }));
      
      // Move to next word after a short delay to ensure state updates are processed
      setTimeout(() => {
        showNextWord();
      }, 100);
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(`Failed to record rating: ${error.message}`);
    }
  });

  // Handle rating a word
  const handleWordRating = async (wordId: string, rating: number) => {
    try {
      await rateWordMutation.mutateAsync({
        wordId,
        correct: rating >= 3, // Consider Good/Easy as correct
        sessionId: sessionId || undefined
      });
      
      // Update metrics
      setSessionMetrics(prev => ({
        ...prev,
        wordsReviewed: prev.wordsReviewed + 1,
      }));
      
      // Show next word after rating
      showNextWord();
    } catch (error: any) {
      // Log the error for debugging
      console.error('Error rating word:', error);
      
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  // Show the next word based on SRS priority
  const showNextWord = () => {
    if (!currentWord) return;
    
    // Remove current word from the queue
    const updatedQueue = [...wordQueue];
    const currentIndex = updatedQueue.findIndex(w => w.id === currentWord.id);
    
    if (currentIndex !== -1) {
      updatedQueue.splice(currentIndex, 1);
      
      // Check if we have words left in the queue
      if (updatedQueue.length > 0) {
        // Move to the next word
        setCurrentWord(updatedQueue[0]);
        setShowDetails(false);
        setNote('');
        setIsNoteSaved(true);
        setWordQueue(updatedQueue);
      } else {
        // Queue is empty, fetch more words
        fetchMoreWords().then(() => {
          // After fetching, check if we have new words
          if (wordQueue.length > 0) {
            setCurrentWord(wordQueue[0]);
            setShowDetails(false);
            setNote('');
            setIsNoteSaved(true);
          }
        });
      }
    }
    
    // If queue is getting short, fetch more words
    if (updatedQueue.length < 10) {
      fetchMoreWords();
    }
  };

  // Initialize session
  useEffect(() => {
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

  // Update note when current word changes
  useEffect(() => {
    if (currentWord) {
      setNote(currentWord.notes || '');
      setIsNoteSaved(true);
    }
  }, [currentWord]);

  // Save notes for the current word
  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: (updatedWord) => {
      toast.success('Note saved!');
      setIsNoteSaved(true);
      
      // Update the note in the current word and queue
      if (currentWord) {
        setCurrentWord({...currentWord, notes: updatedWord.notes});
        
        // Also update in the queue
        setWordQueue(prev => prev.map((w: WordItem) => 
          w.id === updatedWord.id ? {...w, notes: updatedWord.notes} : w
        ));
      }
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(`Failed to save note: ${error.message}`);
    }
  });

  const handleSaveNote = () => {
    if (!currentWord) return;
    saveNoteMutation.mutate({ wordId: currentWord.id, notes: note });
  };

  const handleEndSession = () => {
    if (sessionId) {
      endSessionMutation.mutate({ sessionId });
    }
  };

  // Toggle star status on a word
  const toggleStarMutation = api.vocab.toggleStar.useMutation({
    onSuccess: (updatedWord) => {
      toast.success(updatedWord.isStarred ? 'Word starred!' : 'Star removed');
      
      // Update star status in the UI
      if (currentWord) {
        setCurrentWord({...currentWord, isStarred: updatedWord.isStarred});
        
        // Also update in the queue
        setWordQueue(prev => prev.map((w: WordItem) => 
          w.id === updatedWord.id ? {...w, isStarred: updatedWord.isStarred} : w
        ));
      }
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(`Failed to update star status: ${error.message}`);
    }
  });

  const handleToggleStar = () => {
    if (!currentWord) return;
    toggleStarMutation.mutate({ wordId: currentWord.id });
  };

  // Loading state or no words available
  if (isLoading && !currentWord) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">Loading your practice words...</p>
      </div>
    );
  }

  if (!currentWord) {
    return <p className="text-center text-muted-foreground">No words available for practice right now.</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Session in progress
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
        <CardHeader className="relative">
          <div className="absolute right-4 top-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleStar}
              disabled={toggleStarMutation.isPending}
            >
              <Star className={`h-5 w-5 ${currentWord.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
            </Button>
          </div>
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
            <Button 
              variant="destructive" 
              onClick={() => handleWordRating(currentWord.id, 1)} 
              disabled={rateWordMutation.isPending}
            >
              Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleWordRating(currentWord.id, 2)} 
              disabled={rateWordMutation.isPending}
            >
              Hard
            </Button>
            <Button 
              variant="default" 
              onClick={() => handleWordRating(currentWord.id, 3)} 
              disabled={rateWordMutation.isPending}
            >
              Good
            </Button>
            <Button 
              variant="default" 
              onClick={() => handleWordRating(currentWord.id, 4)} 
              disabled={rateWordMutation.isPending}
            >
              Easy
            </Button>
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
        </CardFooter>
      </Card>
      
      {/* Loading indicator when fetching more words */}
      {isLoading && (
        <div className="flex justify-center items-center mt-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading more words...</span>
        </div>
      )}

      {rateWordMutation.isPending && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p>Recording your rating...</p>
          </div>
        </div>
      )}
    </div>
  );
}