'use client'

import { Button } from "@/components/ui/button";
import { Pencil, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShareWordBankDialog } from "./ShareWordBankDialog";

// Type for the props, matching the data structure from listWordBanks
type WordBankListItemProps = {
  id: string;
  name: string;
  description?: string | null;
  wordCount: number;
  masteryPercentage: number;
  lastPracticedAt?: Date | null;
  isShared?: boolean;
  isAdmin?: boolean;
  groupId?: string | null;
  canShare?: boolean; // Add canShare prop
};

export function WordBankListItem({
  id,
  name,
  description,
  wordCount,
  masteryPercentage,
  isShared = false,
  groupId,
  isAdmin = false, // Add isAdmin prop to function parameters
}: WordBankListItemProps) {
  const router = useRouter();

  // Mutation hook for starting a practice session
  // Removed startVocabSession mutation usage due to missing backend procedure
  // You may re-add this when the backend procedure is available

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
          {/* Removed practice button due to missing mutation */}
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
          {/* Conditionally render ShareWordBankDialog based on isAdmin */}
          {groupId && !isShared && isAdmin && (
            <ShareWordBankDialog
              groupId={groupId || null}
              wordBanks={[{ id, name, description: description ?? null, wordCount }]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
