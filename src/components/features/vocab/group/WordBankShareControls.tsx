"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/trpc";
import { useState } from "react";

interface WordBankShareControlsProps {
  wordBankId: string;
  wordBankName: string;
}

export function WordBankShareControls({ wordBankId, wordBankName }: WordBankShareControlsProps) {
  const { toast } = useToast();

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const shareLinkMutation = api.wordBank.shareWordBank.useMutation({
    onMutate() {
      setIsLoading(true);
    },
    onSuccess(data) {
      setIsLoading(false);
      if (data.shareLink) {
        setShareLink(`${window.location.origin}/share/${data.shareLink}`);
        toast({
          title: "Share link generated",
          description: "You can now copy and share the link.",
          variant: "default",
        });
      }
    },
    onError(error: any) {
      setIsLoading(false);
      toast({
        title: "Error generating share link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateLink = () => {
    shareLinkMutation.mutate({ wordBankId, generateShareLink: true });
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Copied to clipboard",
        description: shareLink,
        variant: "default",
      });
    }
  };

  return (
    <div className="space-y-2 p-2 border rounded bg-gray-50">
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleGenerateLink}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? "Generating..." : "Generate Share Link"}
        </Button>
        {shareLink && (
          <>
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-grow border rounded px-2 py-1 text-sm"
            />
            <Button onClick={handleCopyLink} size="sm" variant="outline">
              Copy
            </Button>
          </>
        )}
      </div>
    </div>
  );
}