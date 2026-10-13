import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  county: z.string().default('Nairobi'),
  town: z.string().optional(),
  monthlyContribution: z.number().positive(),
  shareValue: z.number().positive().default(100),
  registrationFee: z.number().min(0).default(0),
  interestRate: z.number().min(0).max(100).default(10),
  maxLoanMultiple: z.number().positive().default(3),
  loanRepaymentMonths: z.number().int().positive().default(12),
  quorumPercent: z.number().min(0).max(100).default(50),
  mpesaPaybill: z.string().optional(),
  mpesaAccountPrefix: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingVenue: z.string().optional(),
  // First admin member
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminPhone: z.string().regex(/^(?:254|0)[17]\d{8}$/),
})

// POST /api/chama — create a new chama + admin member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      adminFirstName, adminLastName, adminEmail, adminPassword, adminPhone,
      ...chamaData
    } = parsed.data

    // Check for duplicate email
    const existingMember = await db.member.findFirst({
      where: { OR: [{ email: adminEmail.toLowerCase() }, { phone: adminPhone }] },
    })
    if (existingMember) {
      return NextResponse.json(
        { error: 'A member with this email or phone already exists' },
        { status: 409 }
      )
    }

    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    // Generate registration number
    const count = await db.chama.count()
    const regNumber = `CV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const result = await db.$transaction(async tx => {
      const chama = await tx.chama.create({
        data: { ...chamaData, registrationNumber: regNumber },
      })

      const admin = await tx.member.create({
        data: {
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          phone: adminPhone,
          role: 'CHAIRPERSON',
          chamaId: chama.id,
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'CHAMA_CREATED',
          entityType: 'Chama',
          entityId: chama.id,
          chamaId: chama.id,
          memberId: admin.id,
          details: { name: chama.name, regNumber },
        },
      })

      return { chama, admin }
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Create chama error:', error)
    return NextResponse.json({ error: 'Failed to create chama' }, { status: 500 })
  }
}
