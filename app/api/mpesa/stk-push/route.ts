import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { initiateSTKPush, normalisePhone } from '@/lib/mpesa'
import { contributionRef } from '@/lib/utils'

const schema = z.object({
  contributionId: z.string(),
  phone: z.string().optional(), // override member's stored phone
})

// POST /api/mpesa/stk-push — initiate STK push for a contribution
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const contribution = await db.contribution.findFirst({
      where: { id: parsed.data.contributionId, chamaId: session.user.chamaId },
      include: { member: true },
    })
    if (!contribution) return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })
    if (contribution.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

    // Only the member themselves (or an officer) can initiate payment
    if (contribution.memberId !== session.user.id && !['TREASURER', 'CHAIRPERSON', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const phone = normalisePhone(parsed.data.phone ?? contribution.member.phone)
    const remaining = contribution.expectedAmount - contribution.paidAmount

    const ref = contributionRef(session.user.chamaId, contribution.memberId, contribution.periodMonth, contribution.periodYear)

    const stkResult = await initiateSTKPush({
      phone,
      amount: remaining,
      accountReference: ref,
      transactionDesc: `${getMonthName(contribution.periodMonth)} ${contribution.periodYear} Contribution`,
    })

    if (stkResult.ResponseCode !== '0') {
      return NextResponse.json({ error: 'STK Push failed. Please try again.' }, { status: 400 })
    }

    // Store pending transaction
    await db.mpesaTransaction.create({
      data: {
        type: 'CONTRIBUTION',
        status: 'PENDING',
        merchantRequestId: stkResult.MerchantRequestID,
        checkoutRequestId: stkResult.CheckoutRequestID,
        phoneNumber: phone,
        amount: remaining,
        contributionId: contribution.id,
        chamaId: session.user.chamaId,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: stkResult.CheckoutRequestID,
        message: stkResult.CustomerMessage,
      },
    })
  } catch (error) {
    console.error('STK Push error:', error)
    return NextResponse.json({ error: 'Failed to initiate M-Pesa payment' }, { status: 500 })
  }
}

function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString('en-KE', { month: 'long' })
}
