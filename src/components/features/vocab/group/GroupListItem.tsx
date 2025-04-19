import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RouterOutputs } from "@/utils/trpc";

type Group = RouterOutputs["group"]["getUsersGroups"][number];

interface GroupListItemProps {
  group: Group;
}

export function GroupListItem({ group }: GroupListItemProps) {
  return (
    <Card className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{group.name}</h3>
          <p className="text-sm text-gray-500">
            {group.members.length} members
          </p>
        </div>
        <Button variant="outline" size="sm">
          View
        </Button>
      </div>
    </Card>
  );
}