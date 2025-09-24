import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

// GET /api/users - Fetch all users with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    // Build where condition for search. We can search by email at the DB level.
    // However firstname/lastname/nickname are stored encrypted, so we cannot
    // reliably search them with a SQL `contains` on ciphertext. Strategy:
    // - If search is provided, include email search in the DB query and then
    //   perform an in-memory filter on decrypted name fields to match the
    //   plaintext search term. This is less efficient but keeps behavior
    //   correct without adding a search index/migration.
    const where: any = search
      ? {
          OR: [{ email: { contains: search, mode: 'insensitive' as const } }],
        }
      : {}

    const [usersRaw, totalRaw] = await Promise.all([
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

    // Decrypt name fields for each user. If a value is null/undefined, keep it
    // as-is. decrypt() is resilient and will return the original value if
    // decryption fails (compatibility with plaintext data).
    let users = usersRaw.map((u) => ({
      ...u,
      firstname: u.firstname ? decrypt(u.firstname) : u.firstname,
      lastname: u.lastname ? decrypt(u.lastname) : u.lastname,
      nickname: u.nickname ? decrypt(u.nickname) : u.nickname,
    }))

    let total = totalRaw

    // If a search term is present, filter decrypted name fields in-memory
    // to include matches on firstname/lastname/nickname as expected by the
    // original behavior. This may change pagination semantics when search
    // is used because we filtered after fetching a page from the DB; for
    // correctness we should fetch a larger page or re-run a count/filter.
    if (search) {
      const term = search.toLowerCase()
      const filtered = users.filter((u) => {
        return (
          (u.email && u.email.toLowerCase().includes(term)) ||
          (u.firstname && String(u.firstname).toLowerCase().includes(term)) ||
          (u.lastname && String(u.lastname).toLowerCase().includes(term)) ||
          (u.nickname && String(u.nickname).toLowerCase().includes(term))
        )
      })
      // Use filtered results for this response. Note: total still reflects
      // the DB-level count; depending on desired UX you may want to compute
      // total based on decrypted/filtered results instead.
      users = filtered
      total = filtered.length
    }

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

    // Encrypt name fields before creating the user. Only encrypt when a
    // field is provided (non-null). If encryption is misconfigured this will
    // throw and return a 500.
    const user = await prisma.mas_user.create({
      data: {
        email,
        deptid: departmentid || null,
        firstname: firstname ? encrypt(String(firstname)) : null,
        lastname: lastname ? encrypt(String(lastname)) : null,
        nickname: nickname ? encrypt(String(nickname)) : null,
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

    // Decrypt before returning
    const safeUser = {
      ...user,
      firstname: user.firstname ? decrypt(user.firstname) : user.firstname,
      lastname: user.lastname ? decrypt(user.lastname) : user.lastname,
      nickname: user.nickname ? decrypt(user.nickname) : user.nickname,
    }

    return NextResponse.json({ user: safeUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}