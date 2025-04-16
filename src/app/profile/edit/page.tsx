'use client'

import { useSession } from 'next-auth/react';
import ProfileForm from '../ProfileForm';

export default function EditProfilePage() {
  const { data: session } = useSession()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>
      <ProfileForm 
        user={{
          name: session?.user.name || '',
          email: session?.user.email || '',
          image: session?.user.image || ''
        }} 
      />
    </div>
  )
}
