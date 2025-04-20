"use client";

import InvitationForm from "@/components/features/InvitationForm";
import { api, type RouterOutputs } from "@/utils/trpc"; // Corrected import path with @ alias
import React, { useState } from "react";

// Infer the Group type from the tRPC router output
type Group = RouterOutputs['group']['getUsersGroups'][number];

const GroupsPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const { data: groups, isLoading, error } = api.group.getUsersGroups.useQuery();
  const createGroupMutation = api.group.createGroup.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setNewGroupName("");
      void api.group.getUsersGroups.useQuery().refetch();
    },
    onError: (error) => {
      alert(`Failed to create group: ${error.message}`);
    },
  });
  const updateGroupMutation = api.group.updateGroup.useMutation({
    onSuccess: () => {
      setEditingGroupId(null);
      setEditingGroupName("");
      void api.group.getUsersGroups.useQuery().refetch();
    },
    onError: (error) => {
      alert(`Failed to update group: ${error.message}`);
    },
  });
  const deleteGroupMutation = api.group.deleteGroup.useMutation({
    onSuccess: () => {
      void api.group.getUsersGroups.useQuery().refetch();
    },
    onError: (error) => {
      alert(`Failed to delete group: ${error.message}`);
    },
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("Group name cannot be empty");
      return;
    }
    createGroupMutation.mutate({ name: newGroupName.trim() });
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupName.trim() || !editingGroupId) {
      alert("Group name cannot be empty");
      return;
    }
    updateGroupMutation.mutate({ groupId: editingGroupId, name: editingGroupName.trim() });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      deleteGroupMutation.mutate({ groupId });
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-4">My Groups</h1>
      {groups && groups.length > 0 ? (
        <ul>
          {groups.map((group: Group) => (
            <li key={group.id} className="border-b py-4 space-y-2">
              <div className="flex items-center justify-between">
                {editingGroupId === group.id ? (
                  <form onSubmit={handleUpdateGroup} className="flex space-x-2 items-center">
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                      required
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
                      onClick={() => setEditingGroupId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{group.name}</div>
                    <div className="space-x-2">
                      <button
                        className="px-2 py-1 text-sm bg-yellow-400 rounded hover:bg-yellow-500"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* Invitation form for each group */}
              <InvitationForm groupId={group.id} />
              {/* TODO: Add GroupMemberManagement component here once backend support is available */}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">You are not a member of any groups yet.</p>
      )}
      {/* Add button to create group */}
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setShowCreateModal(true)}
      >
        Create New Group
      </button>

      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
            <form
              onSubmit={handleCreateGroup}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default GroupsPage;