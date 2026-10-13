import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().regex(/^(?:254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number'),
  chamaId: z.string(),
  nationalId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password, phone, chamaId, nationalId } = parsed.data

    // Verify chama exists
    const chama = await db.chama.findUnique({ where: { id: chamaId } })
    if (!chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 })
    }

    const existing = await db.member.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { phone }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email or phone already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const member = await db.member.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        passwordHash,
        phone,
        nationalId,
        chamaId,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, chamaId: true, createdAt: true,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'MEMBER_REGISTERED',
        entityType: 'Member',
        entityId: member.id,
        chamaId,
        memberId: member.id,
        details: { firstName, lastName },
      },
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
