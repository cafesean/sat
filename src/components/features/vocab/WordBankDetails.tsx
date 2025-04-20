"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/utils/trpc";
import { Copy, Loader2, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface WordBankDetailsProps {
  wordBankId: string;
}

export function WordBankDetails({ wordBankId }: WordBankDetailsProps) {
  const router = useRouter();
  const [shareType, setShareType] = useState<"user" | "group">("user");
  const [shareTargetId, setShareTargetId] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const { data: wordBank, isLoading } = api.wordBank.getWordBank.useQuery({ wordBankId });
  const { data: groups } = api.group.getUsersGroups.useQuery();
  const { data: sharedWith } = api.wordBank.getWordBanksSharedWithUser.useQuery();

  const shareMutation = api.wordBank.shareWordBank.useMutation({
    onSuccess: () => {
      toast.success("Word bank shared successfully");
      setShareTargetId("");
    },
    onError: (error) => {
      toast.error(`Failed to share word bank: ${error.message}`);
    }
  });

  const generateShareLink = api.wordBank.shareWordBank.useMutation({
    onSuccess: (data) => {
      const shareLink = data.shareLink || data.sharedWordBank?.shareLink;
      if (!shareLink) {
        throw new Error("Failed to generate share link");
      }
      navigator.clipboard.writeText(`${window.location.origin}/share/${shareLink}`);
      toast.success("Share link copied to clipboard");
      setIsGeneratingLink(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate share link: ${error.message}`);
      setIsGeneratingLink(false);
    }
  });

  const handleShare = () => {
    if (!shareTargetId) {
      toast.warning("Please select a user or group to share with");
      return;
    }

    shareMutation.mutate({
      wordBankId,
      [shareType === "group" ? "sharedWithGroupId" : "sharedWithUserId"]: shareTargetId
    });
  };

  const handleGenerateLink = () => {
    setIsGeneratingLink(true);
    generateShareLink.mutate({
      wordBankId,
      generateShareLink: true
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!wordBank) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500">Word bank not found</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{wordBank.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {wordBank.words.length} words
        </p>
      </div>

      {/* Sharing Section */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium">Share this word bank</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={shareType} onValueChange={(value) => setShareType(value as "user" | "group")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Share with" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> User
                </SelectItem>
                <SelectItem value="group" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Group
                </SelectItem>
              </SelectContent>
            </Select>

            {shareType === "group" ? (
              <Select value={shareTargetId} onValueChange={setShareTargetId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a group to share with" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center justify-between">
                        <span>{group.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {group.members.length} members
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Enter user email"
                value={shareTargetId}
                onChange={(e) => setShareTargetId(e.target.value)}
              />
            )}

            <Button onClick={handleShare} disabled={shareMutation.isPending}>
              {shareMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Share
            </Button>
          </div>

          <div className="text-xs text-gray-500 pl-2">
            {shareType === "group"
              ? "Share with all members of a group"
              : "Share with an individual user"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateLink}
            disabled={isGeneratingLink}
          >
            {isGeneratingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Generate Share Link
          </Button>
        </div>
      </div>

      {/* Shared With Section */}
      {sharedWith && sharedWith.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Shared with</h3>
          <div className="space-y-2">
            {sharedWith.map((share) => (
              <div key={share.id} className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{share.sharedWithUserId || share.sharedWithGroupId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}