"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/utils/trpc";
import { Copy, Link as LinkIcon, Mail, Send } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

interface InviteGroupMemberDialogProps {
  groupId: string;
  groupName: string;
}

export const InviteGroupMemberDialog: React.FC<InviteGroupMemberDialogProps> = ({ groupId, groupName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const utils = api.useUtils(); // For potentially invalidating queries later

  const inviteByEmailMutation = api.group.inviteUserToGroup.useMutation({
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      // Optionally close dialog or keep open for more invites
      // setIsOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const generateLinkMutation = api.group.inviteUserToGroup.useMutation({
    onSuccess: (data) => {
      if (data.inviteToken) {
        const inviteUrl = `${window.location.origin}/groups/invite/${data.inviteToken}`;
        setShareLink(inviteUrl);
        toast.success("Shareable invite link generated!");
      } else {
         toast.error("Failed to generate invite link: No token received.");
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate link: ${error.message}`);
    },
  });

  const handleInviteByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.warning("Please enter an email address.");
      return;
    }
    inviteByEmailMutation.mutate({ groupId, email });
  };

  const handleGenerateLink = () => {
    setShareLink(null); // Reset previous link if any
    generateLinkMutation.mutate({ groupId, generateShareLink: true });
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
        .then(() => toast.success("Invite link copied to clipboard!"))
        .catch(() => toast.error("Failed to copy link."));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Invite Members</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Members to {groupName}</DialogTitle>
          <DialogDescription>
            Invite new members via email or generate a shareable link.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="mr-2 h-4 w-4" /> Share Link</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <form onSubmit={handleInviteByEmail} className="space-y-4 py-4">
              <div>
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={inviteByEmailMutation.isPending}>
                  {inviteByEmailMutation.isPending ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send Invite</>}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="link">
            <div className="space-y-4 py-4">
              {shareLink ? (
                <div className="space-y-2">
                  <Label htmlFor="share-link">Share this link:</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="share-link" value={shareLink} readOnly />
                    <Button type="button" size="icon" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                   <p className="text-sm text-muted-foreground">Anyone with this link can join the group.</p>
                </div>
              ) : (
                 <p className="text-sm text-muted-foreground">Generate a link that anyone can use to join this group.</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={generateLinkMutation.isPending}
                >
                  {generateLinkMutation.isPending ? "Generating..." : (shareLink ? "Regenerate Link" : "Generate Invite Link")}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};