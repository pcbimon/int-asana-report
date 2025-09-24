'use client'

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CustomPagination } from './CustomPagination'
import { Edit, Trash2 } from 'lucide-react'

interface User {
  email: string
  firstname?: string | null
  lastname?: string | null
  nickname?: string | null
  deptid?: string | null
  mas_department?: {
    deptid: string
    name?: string | null
  } | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UserTableProps {
  users: User[]
  isLoading: boolean
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onUserEdit: (user: User) => void
  onUserDelete: (email: string) => void
}

export function UserTable({
  users,
  isLoading,
  pagination,
  onPageChange,
  onUserEdit,
  onUserDelete,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Nickname</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No users found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Nickname</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.email}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.firstname || '-'}</TableCell>
                <TableCell>{user.lastname || '-'}</TableCell>
                <TableCell>{user.nickname || '-'}</TableCell>
                <TableCell>
                  {user.mas_department?.name || user.deptid || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUserEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUserDelete(user.email)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
        </div>
        <CustomPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}