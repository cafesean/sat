declare module '@/app/profile/ProfileForm' {
  import { FC } from 'react';
  const ProfileForm: FC<{ user: { name: string; email: string; image?: string } }>
  export default ProfileForm
}
