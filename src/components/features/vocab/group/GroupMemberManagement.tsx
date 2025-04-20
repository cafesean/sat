"use client";

import { api } from "@/utils/trpc";
import React, { useState } from "react";
import { toast } from "sonner";

interface GroupMemberManagementProps {
  groupId: string;
  members: {
    userId: string;
    user: { id: string; name: string | null };
    role: "ADMIN" | "MEMBER";
  }[];
}

const GroupMemberManagement: React.FC<GroupMemberManagementProps> = ({ groupId, members }) => {
  const [localMembers, setLocalMembers] = useState(members);
  const updateRoleMutation = api.group.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Member role updated");
      utils.group.getGroupDetails.invalidate({ groupId });
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
  const removeMemberMutation = api.group.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.group.getGroupDetails.invalidate({ groupId });
      setLocalMembers((prev) => prev.filter((m) => m.userId !== removingUserId));
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  const utils = api.useUtils();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const handleRoleChange = (userId: string, newRole: "ADMIN" | "MEMBER") => {
    updateRoleMutation.mutate({ groupId, userId, role: newRole });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm("Are you sure you want to remove this member from the group?")) {
      setRemovingUserId(userId);
      removeMemberMutation.mutate({ groupId, userId });
    }
  };

  return (
    <div>
      <h3 className="font-medium mb-2">Group Members</h3>
      <ul className="space-y-2">
        {localMembers.map((member) => (
          <li key={member.userId} className="flex items-center justify-between p-2 border rounded">
            <span>{member.user.name || "Unknown User"}</span>
            <div className="flex items-center space-x-2">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.userId, e.target.value as "ADMIN" | "MEMBER")}
                className="border rounded px-2 py-1"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
              <button
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleRemoveMember(member.userId)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GroupMemberManagement;