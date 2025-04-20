"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/utils/trpc";
import { Loader2, Users } from "lucide-react";
import Link from "next/link";
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

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Groups
        </h2>
        <Button asChild size="sm">
          <Link href="/vocabulary/groups/create">Create Group</Link>
        </Button>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Users className="h-12 w-12 text-gray-400" />
          <p className="text-gray-500">You haven't joined any groups yet.</p>
          {/* Only show one create group button */}
        </div>
      ) : (
        <div className="space-y-2 px-2 sm:px-4 lg:px-6">
          {groups.map((group) => (
            <GroupListItem key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}