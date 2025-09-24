import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/departments - Fetch all departments
export async function GET() {
  try {
    const departments = await prisma.mas_department.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}