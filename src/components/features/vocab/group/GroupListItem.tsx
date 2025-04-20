import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { RouterOutputs } from "@/utils/trpc";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type Group = RouterOutputs["group"]["getUsersGroups"][number];

interface GroupListItemProps {
  group: Group;
}

export function GroupListItem({ group }: GroupListItemProps) {
  const creator = group.creator;
  const lastActive = formatDistanceToNow(group.updatedAt, { addSuffix: true });
  const memberCount = group.members.length;

  return (
    <Card className="hover:shadow-sm transition-all mx-2 sm:mx-4 lg:mx-6">
      <Link
        href={`/vocabulary/groups/${group.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={creator?.image ?? undefined} />
              <AvatarFallback>
                {creator?.name?.charAt(0) ?? 'G'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium truncate">{group.name}</h3>
                <span className="text-xs text-gray-500 shrink-0">
                  {lastActive}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                Created by {creator?.name ?? 'unknown'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}