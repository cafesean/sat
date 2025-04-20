"use client";

import { InviteGroupMemberDialog } from "@/components/features/vocab/group/InviteGroupMemberDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Added AlertDialog components
import { Button } from "@/components/ui/button"; // Added Button
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RouterOutputs } from "@/utils/trpc";
import { AlertCircle, LogOut } from "lucide-react"; // Added LogOut
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import { toast } from "sonner"; // Added toast

// Infer types
type GroupDetails = RouterOutputs['group']['getGroupDetails'];
type GroupMember = GroupDetails['members'][number];
type SharedWordBank = GroupDetails['sharedWordBanks'][number];

const GroupDetailsPage = () => {
  const params = useParams();
  const router = useRouter(); // Added router hook
  const groupId = params.groupId as string;

  const { data: session } = useSession();
  const { data: group, isLoading, error } = api.group.getGroupDetails.useQuery(
    { groupId },
    { enabled: !!groupId }
  );

  const leaveGroupMutation = api.group.leaveGroup.useMutation({
    onSuccess: () => {
      toast.success("You have left the group.");
      router.push("/vocabulary/groups"); // Redirect to the main groups list
    },
    onError: (error) => {
      toast.error(`Failed to leave group: ${error.message}`);
    },
  });

  const handleLeaveGroup = () => {
    leaveGroupMutation.mutate({ groupId });
  };

  if (isLoading) return <GroupDetailsSkeleton />;
  if (error) return (
    <div className="container mx-auto px-4 py-8 text-destructive flex items-center gap-2">
      <AlertCircle className="h-5 w-5" />
      <span>Error loading group details: {error.message}</span>
    </div>
  );
  if (!group) return (
     <div className="container mx-auto px-4 py-8 text-muted-foreground">
       Group not found.
     </div>
   );


  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Group Header */}
      <Card>
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          <CardDescription>Created by {group.creator.name || 'Unknown User'}</CardDescription>
          {/* TODO: Add Edit/Delete options for admin/creator */}
        </CardHeader>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"> {/* Added flex layout */}
          <CardTitle>Members ({group.members.length})</CardTitle>
          {/* Add Invite button using the Dialog component */}
          <InviteGroupMemberDialog groupId={groupId} groupName={group.name} />
        </CardHeader>
        <CardContent>
          <ul className="divide-y"> {/* Added divider */}
            {group.members.map((member: GroupMember) => (
              <li key={member.userId} className="flex justify-between items-center py-3"> {/* Adjusted padding */}
                <div>
                  <p className="font-medium">{member.user.name || 'Unnamed User'}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
                {/* TODO: Add Kick/Promote options for admin */}
                {/* Example: <Button variant="ghost" size="sm">...</Button> */}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Shared Word Banks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Shared Word Banks ({group.sharedWordBanks.length})</CardTitle>
           {/* TODO: Add Share Bank button */}
        </CardHeader>
        <CardContent>
          {group.sharedWordBanks.length > 0 ? (
            <ul className="space-y-2">
              {group.sharedWordBanks.map((sharedBank: SharedWordBank) => (
                <li key={sharedBank.wordBankId}>
                  <Link
                    href={`/vocabulary/banks/${sharedBank.wordBankId}`}
                    className="block py-2 px-3 rounded-md hover:bg-accent transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium">{sharedBank.wordBank.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Shared by {sharedBank.sharedBy.name || 'Unknown User'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No word banks have been shared with this group yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Leave Group Button with Confirmation - Only show for non-creators */}
      {group.creator.id !== session?.user?.id ? (
        <div className="mt-8 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <LogOut className="mr-2 h-4 w-4" /> Leave Group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to leave this group?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will lose access to shared word banks and group activities. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveGroup}
                  disabled={leaveGroupMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {leaveGroupMutation.isPending ? "Leaving..." : "Leave Group"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className="mt-8 flex justify-end">
          <Button variant="ghost" disabled>
            <AlertCircle className="mr-2 h-4 w-4" />
            As the group creator, you cannot leave. Delete the group instead.
          </Button>
        </div>
      )}

      {/* TODO: Add Edit/Delete options for admin/creator */}
      {/* TODO: Add Kick/Promote options for admin */}
      {/* TODO: Add Share Bank button */}
      {/* TODO: Add link to word bank */}

    </div>
  );
};

// Skeleton component for loading state
const GroupDetailsSkeleton = () => (
  <div className="container mx-auto px-4 py-8 space-y-8">
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/4" />
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3 mb-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2 mb-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-6 w-full" />
      </CardContent>
    </Card>
  </div>
);


export default GroupDetailsPage;