'use client'

import { CreateGroupModal } from "@/components/features/vocab/group/CreateGroupModal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateGroupPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Group</h1>
        <Button variant="outline" asChild>
          <Link href="/vocabulary/groups">
            Back to Groups
          </Link>
        </Button>
      </div>
      
      <CreateGroupModal onSuccess={() => router.push('/vocabulary/groups')}>
        <Button className="w-full">
          Create Group
        </Button>
      </CreateGroupModal>
    </div>
  );
}