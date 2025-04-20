"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/trpc";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GroupInvitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { mutate: acceptInvite, isPending } = api.group.acceptGroupInvite.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Invite accepted",
        description: "You've successfully joined the group",
      });
      router.push(`/vocabulary/groups/${data.member.groupId}`);
    },
    onError: (error) => {
      toast({
        title: "Error accepting invite",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h1 className="text-xl font-semibold mb-4">Invalid Invite Link</h1>
        <p className="text-gray-500 mb-4">The invite link is missing a token</p>
        <Button onClick={() => router.push("/vocabulary/groups")}>
          Back to Groups
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-xl font-semibold mb-4">Group Invitation</h1>
      <p className="text-gray-500 mb-6">You've been invited to join a group</p>
      
      <Button 
        onClick={() => acceptInvite({ inviteToken: token })}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Accept Invitation"
        )}
      </Button>
    </div>
  );
}