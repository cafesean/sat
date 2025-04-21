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
    <Card className="hover:shadow-lg transition-all mx-2 sm:mx-4 lg:mx-6 rounded-lg border border-neutral-200 bg-white">
      <Link
        href={`/vocabulary/groups/${group.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-neutral-300">
              <AvatarImage src={creator?.image ?? undefined} />
              <AvatarFallback>
                {creator?.name?.charAt(0) ?? 'G'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif font-semibold text-neutral-900 truncate">{group.name}</h3>
                <span className="text-xs text-neutral-600 shrink-0">
                  {lastActive}
                </span>
              </div>
              <p className="text-sm text-neutral-600 truncate">
                Created by {creator?.name ?? 'unknown'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-neutral-600">
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