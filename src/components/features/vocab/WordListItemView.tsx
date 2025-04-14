'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { Button } from '@/components/ui/button'; // Import Button
import { api } from '@/utils/trpc'; // Import api
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner'; // Import toast
import { WordInteractionModal } from './WordInteractionModal';

interface WordListItemViewProps {
  word: WordListItem;
  bankId: string;
  onStarToggle?: () => void; // Add callback
}

// Helper function (can be moved to utils)
const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) return { level: 'Beginner', variant: 'destructive' };
  if (interval <= 7) return { level: 'Learning', variant: 'secondary' };
  if (interval <= 30) return { level: 'Consolidating', variant: 'outline' };
  return { level: 'Mastered', variant: 'default' };
};

export function WordListItemView({ word, bankId, onStarToggle }: WordListItemViewProps) {
    const mastery = getMasteryInfo(word.interval);
    const utils = api.useUtils(); // Get utils

    // --- Mutation to toggle star ---
    const toggleStarMutation = api.vocab.toggleStar.useMutation({
       onSuccess: (updatedWord) => {
         // Invalidate list to update UI
         utils.vocab.listByBank.invalidate({ wordBankId: bankId });
         onStarToggle?.(); // Trigger potential parent refetch/update
       },
       onError: (error) => {
         toast.error(`Failed to update star status: ${error.message}`);
       }
     });

  return (
    <WordInteractionModal wordId={word.id} bankId={bankId}>
      {/* The trigger is the list item div */}
      <div className="flex items-center justify-between p-2 border-b cursor-pointer hover:bg-muted/50 relative pl-4">
         {/* Mastery Bar */}
         <div className={`absolute left-0 top-0 bottom-0 w-1 ${
           mastery.variant === 'destructive' ? 'bg-red-500' :
           mastery.variant === 'secondary' ? 'bg-yellow-400' :
           mastery.variant === 'outline' ? 'bg-green-400' :
           'bg-blue-500'
         }`}></div>

        {/* Word Text */}
        <span className="font-medium truncate text-sm flex-grow">
          {word.wordMaster?.baseWord || word.text}
        </span>

        {/* Optional: Add other minimal info like mastery level text or star */}
         {/* Star Button */}
         <Button
           variant="ghost"
           size="icon"
           className={`h-6 w-6 flex-shrink-0 ml-2 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
           onClick={(e) => {
             e.preventDefault(); // Prevent modal trigger
             e.stopPropagation();
             toggleStarMutation.mutate({ wordId: word.id });
           }}
           title={word.isStarred ? 'Unstar word' : 'Star word'}
           disabled={toggleStarMutation.isPending}
         >
           {toggleStarMutation.isPending
             ? <Loader2 className="h-3 w-3 animate-spin" />
             : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
           }
         </Button>
      </div>
    </WordInteractionModal>
  );
}