"use client";

import { api } from "@/utils/trpc";
import React, { useState } from "react";
import { toast } from "sonner";

interface InvitationFormProps {
  groupId: string;
}

const InvitationForm: React.FC<InvitationFormProps> = ({ groupId }) => {
  const [email, setEmail] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const inviteUserMutation = api.group.inviteUserToGroup.useMutation({
    onSuccess: (data) => {
      if (data.inviteToken) {
        const link = `${window.location.origin}/groups/invite/${data.inviteToken}`;
        setShareLink(link);
        toast.success(
          data.isExisting
            ? "This user already has a pending invitation. Here's the existing invite link."
            : "Invitation sent or share link generated."
        );
      }
      setSendingInvite(false);
      setGeneratingLink(false);
      setEmail("");
    },
    onError: (error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
      setSendingInvite(false);
      setGeneratingLink(false);
    },
  });

  const handleSendInvite = () => {
    if (!email) {
      toast.error("Please enter an email address.");
      return;
    }
    setSendingInvite(true);
    inviteUserMutation.mutate({ groupId, email });
  };

  const handleGenerateLink = () => {
    setGeneratingLink(true);
    inviteUserMutation.mutate({ groupId, generateShareLink: true });
  };

  return (
    <div className="p-4 border rounded-md space-y-4 max-w-md">
      <div>
        <label htmlFor={`email-${groupId}`} className="block font-medium mb-1">
          Invite by Email
        </label>
        <input
          id={`email-${groupId}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full border rounded px-3 py-2"
          disabled={sendingInvite || generatingLink}
        />
        <button
          onClick={handleSendInvite}
          disabled={sendingInvite || generatingLink}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sendingInvite ? "Sending..." : "Send Invite"}
        </button>
      </div>
      <div className="border-t pt-4">
        <button
          onClick={handleGenerateLink}
          disabled={sendingInvite || generatingLink}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {generatingLink ? "Generating..." : "Generate Share Link"}
        </button>
        {shareLink && (
          <div className="mt-2 break-all text-sm text-blue-700">
            Share this link: <a href={shareLink} target="_blank" rel="noopener noreferrer">{shareLink}</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationForm;