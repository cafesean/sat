'use client'

import { GroupList } from "@/components/features/vocab/group/GroupList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function GroupsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
        <Button asChild>
          <Link href="/vocabulary/groups/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Link>
        </Button>
      </div>
      <GroupList />
    </div>
  );
}