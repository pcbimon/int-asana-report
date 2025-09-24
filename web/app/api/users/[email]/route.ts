import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/users/[email] - Get a specific user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params
    const decodedEmail = decodeURIComponent(email)
    
    const user = await prisma.mas_user.findUnique({
      where: { email: decodedEmail },
      include: {
        mas_department: {
          select: {
            deptid: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[email] - Update a specific user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params
    const decodedEmail = decodeURIComponent(email)
    const body = await request.json()
    const { firstname, lastname, nickname, departmentid } = body

    // Check if user exists
    const existingUser = await prisma.mas_user.findUnique({
      where: { email: decodedEmail },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user
    const user = await prisma.mas_user.update({
      where: { email: decodedEmail },
      data: {
        firstname: firstname !== undefined ? firstname : undefined,
        lastname: lastname !== undefined ? lastname : undefined,
        nickname: nickname !== undefined ? nickname : undefined,
        deptid: departmentid !== undefined ? departmentid : undefined,
      },
      include: {
        mas_department: {
          select: {
            deptid: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[email] - Delete a specific user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    // Check if user exists
    const existingUser = await prisma.mas_user.findUnique({
      where: { email: decodedEmail },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user
    await prisma.mas_user.delete({
      where: { email: decodedEmail },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}