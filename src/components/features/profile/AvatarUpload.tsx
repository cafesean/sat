'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/utils/trpc';
import { useState } from 'react';

export default function AvatarUpload({ 
  currentAvatar,
  userId 
}: {
  currentAvatar?: string
  userId: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const updateAvatar = api.user.updateAvatar.useMutation()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("Selected file:", file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64File = reader.result as string;
      console.log("Base64 file:", base64File);

      setIsLoading(true);
      try {
        await updateAvatar.mutateAsync({
          file: base64File,
          userId,
        });
        toast({
          title: 'Avatar updated',
          description: 'Your profile picture has been updated',
        });
      } catch (error) {
        console.error("Error updating avatar:", error);
        toast({
          title: 'Error',
          description: 'Failed to update avatar',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={currentAvatar} />
        <AvatarFallback>
          {currentAvatar?.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <Button asChild variant="outline" disabled={isLoading}>
        <label>
          Change Avatar
          <Input 
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </Button>
    </div>
  )
}
