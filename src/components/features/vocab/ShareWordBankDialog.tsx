'use client'

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/utils/trpc";
import { Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ShareWordBankDialogProps = {
  groupId: string | null; // Updated type to allow null
  wordBanks: Array<{
    id: string;
    name: string;
    description: string | null;
    wordCount: number;
  }>;
};

export function ShareWordBankDialog({ groupId, wordBanks }: ShareWordBankDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const shareMutation = api.group.shareWordBankWithGroup.useMutation({
    onSuccess: () => {
      toast.success("Word bank shared successfully!");
      setOpen(false);
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.warning("This word bank is already shared with the group");
      } else {
        toast.error(`Failed to share word bank: ${error.message}`);
      }
    }
  });

  const handleShare = (wordBankId: string) => {
    setSelectedBankId(wordBankId);
    // Ensure groupId is not null before mutating
    if (groupId) {
      shareMutation.mutate({ groupId, wordBankId });
    } else {
      // Handle the case where groupId is null, maybe show an error or disable the share button
      console.error("Cannot share word bank: groupId is null");
      toast.error("Cannot share word bank without a group.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Share word bank">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share word bank</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Word Bank with Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {wordBanks.length === 0 ? (
            <p className="text-muted-foreground">You don't have any word banks to share</p>
          ) : (
            <div className="space-y-2">
              {wordBanks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <h4 className="font-medium">{bank.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {bank.wordCount} words • {bank.description || "No description"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShare(bank.id)}
                    disabled={shareMutation.isPending && selectedBankId === bank.id}
                  >
                    {shareMutation.isPending && selectedBankId === bank.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Share"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}