"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/trpc";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const AcceptInvitePage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const inviteToken = params.inviteToken as string;

  // Handle unauthenticated state - must be before any conditional returns
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      // Redirect to login, passing the invite page as callbackUrl
      const callbackUrl = `/groups/invite/${inviteToken}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [authStatus, inviteToken, router]);

  // Mutation to accept the invite
  const acceptInviteMutation = api.group.acceptGroupInvite.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully joined group!`); // TODO: Add group name if available from mutation response
      setTimeout(() => {
        router.push(`/vocabulary/groups/${data.member.groupId}`); // Redirect to the group page
      }, 0);
    },
    onError: (error) => {
      // Handle specific errors
      if (error.data?.code === 'FORBIDDEN') {
         toast.error("This invitation is not for you or has expired.");
      } else if (error.data?.code === 'NOT_FOUND') {
         toast.error("Invalid or expired invitation link.");
      } else {
         toast.error(`Failed to accept invitation: ${error.message}`);
      }
    },
  });

  // Handle loading state for authentication
  if (authStatus === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Skeleton className="h-48 w-full max-w-md" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Display loading/success/error state for the mutation
  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Group Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {acceptInviteMutation.isPending && (
            <>
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </>
          )}
          {!acceptInviteMutation.isPending && !acceptInviteMutation.isSuccess && !acceptInviteMutation.isError && (
            <button
              onClick={() => acceptInviteMutation.mutate({ inviteToken })}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Accept Invitation
            </button>
          )}
          {acceptInviteMutation.isError && (
            <div className="text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              <span>Failed to accept invitation.</span>
              <span className="text-sm">{acceptInviteMutation.error.message}</span>
            </div>
          )}
          {acceptInviteMutation.isSuccess && (
            <div className="text-green-600 flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              <span>Successfully joined the group! Redirecting...</span>
            </div>
          )}
        </CardContent>
        {/* Footer might not be needed if auto-accepting */}
        {/* <CardFooter>
           <Button
             onClick={() => acceptInviteMutation.mutate({ inviteToken })}
             disabled={acceptInviteMutation.isPending || acceptInviteMutation.isSuccess}
             className="w-full"
           >
             {acceptInviteMutation.isPending ? "Accepting..." : "Accept Invitation"}
           </Button>
         </CardFooter> */}
      </Card>
    </div>
  );
};

export default AcceptInvitePage;