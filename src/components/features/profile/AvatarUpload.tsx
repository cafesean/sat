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
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      await updateAvatar.mutateAsync({
        url: data.url
      })
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated'
      })
    } catch (error) {
      console.error('Error updating avatar:', error)
      toast({
        title: 'Error',
        description: 'Failed to update avatar',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

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
