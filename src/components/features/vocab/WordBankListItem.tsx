'use client'

import { Button } from "@/components/ui/button";
import { api, type RouterOutputs } from "@/utils/trpc";
import { Pencil, Play, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Type for the props, matching the data structure from listWordBanks
type WordBankListItemProps = RouterOutputs['vocab']['listWordBanks'][number] & {
  isShared?: boolean;
};

export function WordBankListItem({
  id,
  name,
  description,
  wordCount,
  masteryPercentage,
  // Add missing props to satisfy the type, even if unused
  createdAt,
  updatedAt,
  userId,
  isShared = false,
}: WordBankListItemProps) {
  const router = useRouter();

  // Mutation hook for starting a practice session
  const startSessionMutation = api.vocab.startVocabSession.useMutation({
    onSuccess: (data) => {
      toast.success('Practice session started!');
      router.push(`/vocabulary/practice/${data.practiceSessionId}`);
    },
    onError: (error) => {
      toast.error(`Failed to start session: ${error.message}`);
    }
  });

  const handleStartPractice = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent potential parent link navigation if wrapped
    e.stopPropagation();
    startSessionMutation.mutate({ wordBankId: id });
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 border rounded-md hover:bg-muted/50">
      {/* Left side: Title, Word Count */}
      <div className="flex flex-col flex-grow overflow-hidden mr-4">
        <Link href={`/vocabulary/banks/${id}`} className="truncate">
          {/* Make title larger */}
          <div className="flex items-center gap-1">
            <span className="text-xl font-semibold hover:underline">{name}</span>
            {isShared && <Users className="h-4 w-4 text-muted-foreground" />}
          </div>
        </Link>
        <span className="text-sm text-muted-foreground">{wordCount} words</span>
      </div>

      {/* Right side: Mastery and Actions */}
      <div className="flex items-center gap-4 flex-shrink-0"> {/* Increased gap */}
        {/* Mastery - Align right */}
        <div className="text-right"> {/* Always show, align right */}
           <span className="text-xs text-muted-foreground block">Mastery</span> {/* Use block */}
           <p className="text-lg font-semibold">{masteryPercentage}%</p>
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex items-center gap-1"> {/* Wrap buttons for closer spacing */}
          <Button
            variant="secondary" // Colored practice button
            size="icon" // Icon only for compactness
            onClick={handleStartPractice}
            disabled={startSessionMutation.isPending}
            title="Learn this bank"
          >
            <Play className="h-4 w-4" />
            <span className="sr-only">Learn</span>
            {/* Removed loading text for icon button */}
          </Button>
          <Link href={`/vocabulary/banks/${id}`} passHref>
            <Button variant="outline" size="icon" title="Manage Words">
               <Settings className="h-4 w-4" />
               <span className="sr-only">Manage Words</span>
            </Button>
          </Link>
          <Link href={`/vocabulary/edit/${id}`}>
            <Button variant="ghost" size="icon" title="Edit Bank">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit Bank</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
