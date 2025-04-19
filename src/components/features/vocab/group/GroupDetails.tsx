"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RouterOutputs } from "@/utils/trpc";
import { api } from "@/utils/trpc";
import { Loader2 } from "lucide-react";

type SharedWordBank = RouterOutputs["wordBank"]["getWordBanksSharedWithGroup"][number];

interface GroupDetailsProps {
  groupId: string;
}

export function GroupDetails({ groupId }: GroupDetailsProps) {
  const {
    data: group,
    isLoading: isLoadingGroup,
    error: groupError,
  } = api.group.getGroupDetails.useQuery({ groupId });

  const {
    data: sharedWordBanks,
    isLoading: isLoadingWordBanks,
    error: wordBanksError,
  } = api.wordBank.getWordBanksSharedWithGroup.useQuery({ groupId });

  if (isLoadingGroup || isLoadingWordBanks) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (groupError || wordBanksError) {
    const error = groupError || wordBanksError;
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Error loading group details: {error?.message}
        </p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500">Group not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{group.name}</h2>
        
        <div className="mb-6">
          <h3 className="font-medium mb-2">Members ({group.members.length})</h3>
          <div className="space-y-2">
            {group.members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span>{member.user.name}</span>
                <span className="text-sm text-gray-500">{member.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Shared Word Banks ({sharedWordBanks?.length || 0})</h3>
          {sharedWordBanks?.length ? (
            <div className="space-y-2">
              {sharedWordBanks.map((wordBank) => (
                <div key={wordBank.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span>{wordBank.wordBank.name}</span>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No word banks shared with this group yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}