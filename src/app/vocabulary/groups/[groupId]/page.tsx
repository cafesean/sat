'use client'

import { GroupDetails } from "@/components/features/vocab/group/GroupDetails";
import { useParams } from "next/navigation";

export default function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <GroupDetails groupId={groupId} />
    </div>
  );
}