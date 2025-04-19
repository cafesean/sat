"use client";

import { api } from "@/utils/trpc";
import { Loader2 } from "lucide-react";
import { GroupListItem } from "./GroupListItem";

export function GroupList() {
  const { data: groups, isLoading, error } = api.group.getUsersGroups.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Error loading groups: {error.message}
        </p>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500">You haven't joined any groups yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <GroupListItem key={group.id} group={group} />
      ))}
    </div>
  );
}