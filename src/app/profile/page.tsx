'use client'

import ProfileForm from '@/app/profile/ProfileForm';
import { Button } from '@/components/ui/button';
import { api } from '@/utils/trpc';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: user, isLoading } = api.user.getProfile.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Error: Unable to load profile data.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <ProfileForm user={{
        name: user.name || '',
        email: user.email,
        image: user.image || undefined,
        gradeLevel: user.gradeLevel,
        languagePreference: user.languagePreference,
      }} />
    </div>
  );
}
