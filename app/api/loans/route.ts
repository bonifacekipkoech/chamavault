import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateLoanRepayable, maxLoanAmount } from '@/lib/utils'

const applySchema = z.object({
  type: z.enum(['EMERGENCY', 'DEVELOPMENT', 'EDUCATION', 'WELFARE', 'NORMAL']).default('NORMAL'),
  principalAmount: z.number().positive(),
  purpose: z.string().min(10).max(500),
  repaymentMonths: z.number().int().min(1).max(60).optional(),
  guarantorId: z.string().optional(),
})

// GET /api/loans
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const memberId = searchParams.get('memberId')

    const where: any = { chamaId: session.user.chamaId }

    if (!isOfficer(session.user.role)) {
      where.memberId = session.user.id
    } else if (memberId) {
      where.memberId = memberId
    }

    if (status) where.status = status

    const loans = await db.loan.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true, phone: true } },
        guarantor: { select: { firstName: true, lastName: true } },
        repayments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: loans })
  } catch (error) {
    console.error('Get loans error:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

// POST /api/loans — apply for a loan
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = applySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const chama = await db.chama.findUnique({ where: { id: session.user.chamaId } })
    if (!chama) return NextResponse.json({ error: 'Chama not found' }, { status: 404 })

    // Check member has no active loan
    const activeLoan = await db.loan.findFirst({
      where: { memberId: session.user.id, status: { in: ['ACTIVE', 'DISBURSED', 'APPROVED'] } },
    })
    if (activeLoan) {
      return NextResponse.json(
        { error: 'You already have an active loan. Please repay it before applying for a new one.' },
        { status: 400 }
      )
    }

    const member = await db.member.findUnique({ where: { id: session.user.id } })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const max = maxLoanAmount(member.totalContributed, chama.maxLoanMultiple)
    if (parsed.data.principalAmount > max) {
      return NextResponse.json(
        { error: `Maximum loan you qualify for is KES ${max.toLocaleString()} (${chama.maxLoanMultiple}× your contributions)` },
        { status: 400 }
      )
    }

    const repaymentMonths = parsed.data.repaymentMonths ?? chama.loanRepaymentMonths
    const { totalInterest, totalRepayable } = calculateLoanRepayable(
      parsed.data.principalAmount,
      chama.interestRate,
      repaymentMonths
    )

    const loan = await db.loan.create({
      data: {
        type: parsed.data.type,
        principalAmount: parsed.data.principalAmount,
        interestRate: chama.interestRate,
        totalInterest,
        totalRepayable,
        outstandingBalance: totalRepayable,
        purpose: parsed.data.purpose,
        repaymentMonths,
        guarantorId: parsed.data.guarantorId,
        memberId: session.user.id,
        chamaId: session.user.chamaId,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'LOAN_APPLIED',
        entityType: 'Loan',
        entityId: loan.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { amount: loan.principalAmount, purpose: loan.purpose },
      },
    })

    return NextResponse.json({ success: true, data: loan }, { status: 201 })
  } catch (error) {
    console.error('Apply loan error:', error)
    return NextResponse.json({ error: 'Failed to apply for loan' }, { status: 500 })
  }
}
