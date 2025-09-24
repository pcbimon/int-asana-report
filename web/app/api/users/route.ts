import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/users - Fetch all users with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    // Build where condition for search
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstname: { contains: search, mode: 'insensitive' as const } },
            { lastname: { contains: search, mode: 'insensitive' as const } },
            { nickname: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.mas_user.findMany({
        where,
        skip,
        take: limit,
        include: {
          mas_department: {
            select: {
              deptid: true,
              name: true,
            },
          },
        },
        orderBy: { email: 'asc' },
      }),
      prisma.mas_user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, firstname, lastname, nickname, departmentid } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.mas_user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const user = await prisma.mas_user.create({
      data: {
        email,
        firstname: firstname || null,
        lastname: lastname || null,
        nickname: nickname || null,
        deptid: departmentid || null,
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

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}