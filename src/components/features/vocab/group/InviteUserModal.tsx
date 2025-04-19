'use client'

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface InviteUserModalProps {
  children: React.ReactNode;
  groupId: string;
  onSuccess?: () => void;
}

export function InviteUserModal({ children, groupId, onSuccess }: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const utils = api.useUtils();

  const inviteUser = api.group.inviteUserToGroup.useMutation({
    onSuccess: () => {
      toast.success('User invited successfully!');
      setEmail('');
      setIsOpen(false);
      utils.group.getGroupDetails.invalidate({ groupId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to invite user: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email cannot be empty');
      return;
    }
    inviteUser.mutate({ groupId, email });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User to Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user's email"
              disabled={inviteUser.isPending}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={inviteUser.isPending || !email.trim()}>
              {inviteUser.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Invite User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}