"use client";

import { api, type RouterOutputs } from "@/utils/trpc"; // Corrected import path with @ alias

// Infer the Group type from the tRPC router output
type Group = RouterOutputs['group']['getUsersGroups'][number];

const GroupsPage = () => {
  const { data: groups, isLoading, error } = api.group.getUsersGroups.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-4">My Groups</h1>
      {groups && groups.length > 0 ? (
        <ul>
          {groups.map((group: Group) => ( // Type annotation using inferred type
            <li key={group.id} className="border-b py-2">
              {group.name}
              {/* TODO: Add link to group details page */}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">You are not a member of any groups yet.</p>
      )}
      {/* TODO: Add button to create group */}
    </div>
  );
};

export default GroupsPage;