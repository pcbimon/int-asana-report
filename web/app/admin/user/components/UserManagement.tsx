'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { UserTable } from './UserTable'
import { UserDialog } from './UserDialog'

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

interface Department {
  deptid: string
  name?: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Fetch users
  const fetchUsers = async (page = 1, searchTerm = search) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
      })
      
      const response = await fetch(`/api/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (!response.ok) throw new Error('Failed to fetch departments')
      
      const data = await response.json()
      setDepartments(data.departments)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value)
    fetchUsers(1, value)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchUsers(page)
  }

  // Handle user create/update
  const handleUserSave = async (userData: Omit<User, 'mas_department'>) => {
    try {
      const url = editingUser ? `/api/users/${encodeURIComponent(editingUser.email)}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          nickname: userData.nickname,
          departmentid: userData.deptid,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save user')
      }

      await fetchUsers(pagination.page)
      setIsDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error saving user:', error)
      throw error
    }
  }

  // Handle user delete
  const handleUserDelete = async (email: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete user')

      await fetchUsers(pagination.page)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  // Handle user edit
  const handleUserEdit = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  // Initial load
  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage system users and their information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Add User */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => {
                setEditingUser(null)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* User Table */}
          <UserTable
            users={users}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onUserEdit={handleUserEdit}
            onUserDelete={handleUserDelete}
          />
        </div>
      </CardContent>

      {/* User Dialog */}
      <UserDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingUser(null)
        }}
        user={editingUser}
        departments={departments}
        onSave={handleUserSave}
      />
    </Card>
  )
}