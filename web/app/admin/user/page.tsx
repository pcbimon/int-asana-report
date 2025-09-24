import { Suspense } from 'react'
import { UserManagement } from './components/UserManagement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUserPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage system users, departments, and user information.
        </p>
      </div>
      
      <Suspense fallback={<UserManagementSkeleton />}>
        <UserManagement />
      </Suspense>
    </div>
  )
}

function UserManagementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}