"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/trpc";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

const CreateGroupPage = () => {
  const [groupName, setGroupName] = useState("");
  const router = useRouter();

  const createGroupMutation = api.group.createGroup.useMutation({
    onSuccess: (data) => {
      toast.success(`Group "${data.group.name}" created successfully!`);
      router.push(`/vocabulary/groups/${data.group.id}`); // Redirect to the new group's page (assuming it exists)
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.warning("Please enter a group name.");
      return;
    }
    createGroupMutation.mutate({ name: groupName });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
          <CardDescription>Enter a name for your new group.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              maxLength={50} // Add a reasonable max length
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateGroupPage;