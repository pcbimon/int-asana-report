import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

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

    // Decrypt name fields before returning to the client. If decryption fails
    // the decrypt function returns the original value, which preserves
    // compatibility with plaintext-stored values.
    const safeUser = {
      ...user,
      firstname: user.firstname ? decrypt(user.firstname) : user.firstname,
      lastname: user.lastname ? decrypt(user.lastname) : user.lastname,
      nickname: user.nickname ? decrypt(user.nickname) : user.nickname,
    }

    return NextResponse.json({ user: safeUser })
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
    const body = await request.json() as {
      firstname?: string | null
      lastname?: string | null
      nickname?: string | null
      departmentid?: string | null
    }
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

    // Encrypt name fields before saving. Only encrypt when a field is provided
    // (not undefined). Use the encrypt helper which will throw if keys are
    // missing — let that surface as a 500 so the caller knows encryption is
    // misconfigured.
  const dataToUpdate: Record<string, unknown> = {}
    if (firstname !== undefined) dataToUpdate.firstname = firstname === null ? null : encrypt(String(firstname))
    if (lastname !== undefined) dataToUpdate.lastname = lastname === null ? null : encrypt(String(lastname))
    if (nickname !== undefined) dataToUpdate.nickname = nickname === null ? null : encrypt(String(nickname))
    if (departmentid !== undefined) dataToUpdate.deptid = departmentid

    // Update user
    const user = await prisma.mas_user.update({
      where: { email: decodedEmail },
      data: dataToUpdate,
      include: {
        mas_department: {
          select: {
            deptid: true,
            name: true,
          },
        },
      },
    })

    // Decrypt returned fields for the response
    const safeUser = {
      ...user,
      firstname: user.firstname ? decrypt(user.firstname) : user.firstname,
      lastname: user.lastname ? decrypt(user.lastname) : user.lastname,
      nickname: user.nickname ? decrypt(user.nickname) : user.nickname,
    }

    return NextResponse.json({ user: safeUser })
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