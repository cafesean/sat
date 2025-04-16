'use client'

import AvatarUpload from '@/components/features/profile/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/utils/trpc';
import { Loader2 } from "lucide-react";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const languages = [
  'English', 'Spanish', 'French', 'German', 
  'Chinese (Simplified)', 'Chinese (Traditional)',
  'Japanese', 'Korean', 'Bahasa', 'Malay',
  'Hindi', 'Vietnamese', 'Thai'
]

export default function ProfileForm({ user }: { user: { name: string; email: string; image?: string; gradeLevel?: number | null; languagePreference?: string | null } }) {
  const [name, setName] = useState(user.name);
  const [gradeLevel, setGradeLevel] = useState(user.gradeLevel?.toString() || '9');
  const [language, setLanguage] = useState(user.languagePreference || 'English');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false); // Keep track if last save was successful
  const { toast } = useToast();
  // Remove isDirty state, calculate directly
  // const [isDirty, setIsDirty] = useState(false);
  const { data: session } = useSession();
  const updateProfile = api.user.updateProfile.useMutation();

  useEffect(() => {
    setName(user.name);
    setGradeLevel(user.gradeLevel?.toString() || '9');
    setLanguage(user.languagePreference || 'English');
    setIsSaved(false); // Reset saved state when user prop changes
  }, [user]);

  // Calculate isDirty directly during render
  const isDirty = name !== user.name ||
                  gradeLevel !== (user.gradeLevel?.toString() || '9') ||
                  language !== (user.languagePreference || 'English');

  // Effect to reset isSaved when the form becomes dirty *after* a save
  useEffect(() => {
    if (isDirty) {
      setIsSaved(false);
    }
  }, [isDirty]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      toast({
        title: "Validation Error",
        description: "Name must be at least 2 characters long.",
        variant: "destructive",
      });
      return;
    }

    console.log("Form submitted with:", { name, gradeLevel, language });
    setIsLoading(true);
    setIsSaved(false);
    try {
      await updateProfile.mutateAsync({
        name,
        gradeLevel: parseInt(gradeLevel),
        languagePreference: language,
      });
      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
      });
      setIsSaved(true); // Mark as saved
      // isDirty will become false automatically on next render because state now matches user prop
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvatarUpload 
        currentAvatar={user.image}
        userId={session?.user?.id as string}
      />

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={user.email}
          readOnly
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Grade Level</Label>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 16 }, (_, i) => i + 1).map(grade => (
                <SelectItem key={grade} value={grade.toString()}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map(lang => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Disable button if not dirty OR if loading */}
      <Button type="submit" disabled={!isDirty || isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : isSaved ? ( // Show 'Saved' only if saved AND not dirty
          'Saved'
        ) : (
          'Save Changes' // Show 'Save Changes' if dirty or not yet saved
        )}
      </Button>
    </form>
  )
}
