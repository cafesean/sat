"use client";

import { api } from "@/utils/trpc";
import React, { useState } from "react";
import { toast } from "sonner";

interface GroupMemberManagementProps {
  groupId: string;
  members: {
    userId: string;
    user: { id: string; name: string | null };
    role: "admin" | "member";
  }[];
  currentUserId: string;
}

const GroupMemberManagement: React.FC<GroupMemberManagementProps> = ({ groupId, members, currentUserId }) => {
  const [localMembers, setLocalMembers] = useState(members);
  const updateRoleMutation = api.group.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Member role updated");
      utils.group.getGroupDetails.invalidate({ groupId });
    },
    onError: (error: any) => { // Explicitly type error
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
  const removeMemberMutation = api.group.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.group.getGroupDetails.invalidate({ groupId });
      setLocalMembers((prev) => prev.filter((m) => m.userId !== removingUserId));
    },
    onError: (error: any) => { // Explicitly type error
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  const utils = api.useUtils();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Determine if the current user is an admin
  const currentUserMember = localMembers.find(m => m.userId === currentUserId);
  const isAdmin = currentUserMember && currentUserMember.role === "admin";

  const handleRoleChange = (userId: string, newRole: "admin" | "member") => {
    updateRoleMutation.mutate({ groupId, targetUserId: userId, role: newRole });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm("Are you sure you want to remove this member from the group?")) {
      setRemovingUserId(userId);
      removeMemberMutation.mutate({ groupId, targetUserId: userId });
    }
  };

  return (
    <div>
      <h3 className="font-medium mb-2">Group Members</h3>
      <ul className="space-y-2">
        {localMembers.map((member) => {
          // Check if this member is the group creator (assuming the first admin is the creator)
          const isCreator = localMembers.find(m => m.role === "admin")?.userId === member.userId;
          return (
            <li key={member.userId} className="flex items-center justify-between p-2 border rounded">
              <span>{member.user.name || "Unknown User"}</span>
              <div className="flex items-center space-x-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as "admin" | "member")}
                  className="border rounded px-2 py-1"
                  disabled={!isAdmin || isCreator} // Disable if current user is not admin or if member is creator
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                <button
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={!isAdmin || isCreator} // Disable if current user is not admin or if member is creator
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GroupMemberManagement;