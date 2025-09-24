'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

interface User {
  email: string
  firstname?: string | null
  lastname?: string | null
  nickname?: string | null
  deptid?: string | null
}

interface Department {
  deptid: string
  name?: string | null
}

interface UserDialogProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  departments: Department[]
  onSave: (user: User) => Promise<void>
}

export function UserDialog({
  isOpen,
  onClose,
  user,
  departments,
  onSave,
}: UserDialogProps) {
  const [formData, setFormData] = useState<User>({
    email: '',
    firstname: '',
    lastname: '',
    nickname: '',
    deptid: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          email: user.email || '',
          firstname: user.firstname || '',
          lastname: user.lastname || '',
          nickname: user.nickname || '',
          deptid: user.deptid || '',
        })
      } else {
        setFormData({
          email: '',
          firstname: '',
          lastname: '',
          nickname: '',
          deptid: '',
        })
      }
      setError('')
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof User, value: string) => {
    // Radix Select treats an empty string as the "clear" value. The Select primitive
    // throws if an Item is rendered with value="". Use a sentinel "__none" value
    // for the placeholder option and map it back to null in the form state.
    const mapped = value === '__none' || value === '' ? null : value
    setFormData(prev => ({
      ...prev,
      [field]: mapped,
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!!user || isLoading} // Disable editing email for existing users
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              value={formData.firstname || ''}
              onChange={(e) => handleInputChange('firstname', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              value={formData.lastname || ''}
              onChange={(e) => handleInputChange('lastname', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname || ''}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              // Use the sentinel '__none' when deptid is null/empty so we don't render
              // an Item with an empty string as value (Radix will throw).
              value={formData.deptid || '__none'}
              onValueChange={(value) => handleInputChange('deptid', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.deptid} value={dept.deptid}>
                    {dept.name || dept.deptid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.email}
            >
              {isLoading ? 'Saving...' : user ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}