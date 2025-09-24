import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

interface BulkUser {
  email: string
  firstname?: string
  lastname?: string
  nickname?: string
  deptid?: string
}

interface BulkImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    email: string
    error: string
  }>
}

// POST /api/users/bulk-import - Import multiple users from CSV data
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      users: BulkUser[]
    }
    
    const { users } = body

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'No users data provided' },
        { status: 400 }
      )
    }

    // Validate each user has required email field
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      if (!user.email?.trim()) {
        return NextResponse.json(
          { error: `User at row ${i + 1} is missing required email field` },
          { status: 400 }
        )
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email.trim())) {
        return NextResponse.json(
          { error: `User at row ${i + 1} has invalid email format: ${user.email}` },
          { status: 400 }
        )
      }
    }

    // Check if any departments referenced exist
    const deptIds = users.map(u => u.deptid).filter((id): id is string => Boolean(id))
    const uniqueDeptIds = [...new Set(deptIds)]
    
    if (uniqueDeptIds.length > 0) {
      const existingDepts = await prisma.mas_department.findMany({
        where: { deptid: { in: uniqueDeptIds } },
        select: { deptid: true }
      })
      const existingDeptIds = existingDepts.map(d => d.deptid)
      const invalidDeptIds = uniqueDeptIds.filter(id => !existingDeptIds.includes(id))
      
      if (invalidDeptIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid department IDs: ${invalidDeptIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Process users one by one to handle individual errors
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const rowNumber = i + 1
      
      try {
        const email = user.email.trim().toLowerCase()
        
        // Check if user already exists
        const existingUser = await prisma.mas_user.findUnique({
          where: { email }
        })

        // Prepare encrypted data
        const userData = {
          firstname: user.firstname?.trim() ? encrypt(user.firstname.trim()) : null,
          lastname: user.lastname?.trim() ? encrypt(user.lastname.trim()) : null,
          nickname: user.nickname?.trim() ? encrypt(user.nickname.trim()) : null,
          deptid: user.deptid?.trim() || null,
        }

        if (existingUser) {
          // Update existing user (overwrite fields)
          await prisma.mas_user.update({
            where: { email },
            data: userData,
          })
          result.success++
        } else {
          // Create new user (include email)
          await prisma.mas_user.create({
            data: {
              email,
              ...userData,
            },
          })
          result.success++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          row: rowNumber,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    // Return results
    return NextResponse.json({
      message: `Import completed: ${result.success} users imported successfully, ${result.failed} failed`,
      result
    })

  } catch (error) {
    console.error('Error in bulk import:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    )
  }
}