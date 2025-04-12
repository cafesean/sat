'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/utils/trpc';
import { UserRole } from '@prisma/client'; // Import UserRole
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AdminUsersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { data: users, isLoading, error, refetch } = api.admin.listUsers.useQuery(
    undefined, // No input needed for listUsers
    {
      enabled: session?.user?.role === UserRole.ADMIN, // Only fetch if user is admin
    }
  )

  const updateUserRoleMutation = api.admin.updateUserRole.useMutation({
    onSuccess: () => {
      refetch() // Refetch user list after successful update
      // Optionally show a success toast
    },
    onError: (error) => {
      // Optionally show an error toast
      console.error("Failed to update user role:", error)
    }
  })

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUserRoleMutation.mutate({ userId, newRole })
  }

  // Loading state for session
  if (sessionStatus === 'loading') {
    return <div className="container mx-auto p-4"><Skeleton className="h-8 w-1/4 mb-4" /><Skeleton className="h-64 w-full" /></div>
  }

  // Check if user is admin
  if (session?.user?.role !== UserRole.ADMIN) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-[50vh]">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    )
  }

  // Main content for admin
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {isLoading && (
        <div>
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
        </div>
      )}
      {error && (
        <div className="text-destructive flex items-center gap-2 bg-destructive/10 p-4 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading users: {error.message}</span>
        </div>
      )}
      {!isLoading && !error && users && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                 <TableCell>
                    {/* Prevent changing own role */}
                    {user.id === session?.user?.id ? ( // Added optional chaining
                      <span className="font-medium">{user.role}</span>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                        disabled={updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.id} // Changed isLoading to isPending
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select role" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value={UserRole.USER}>User</SelectItem>
                         <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                 <TableCell className="text-right">
                   {/* Add other actions like delete later if needed */}
                   {updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.id && ( // Changed isLoading to isPending
                      <span className="text-xs text-muted-foreground">Updating...</span>
                   )}
                 </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
