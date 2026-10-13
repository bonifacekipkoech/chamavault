import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/mpesa/status?checkoutRequestId=XXX — poll transaction status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const checkoutRequestId = searchParams.get('checkoutRequestId')
    if (!checkoutRequestId) return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 })

    const tx = await db.mpesaTransaction.findUnique({
      where: { checkoutRequestId },
      select: { status: true, mpesaReceiptNumber: true, amount: true, resultDesc: true },
    })

    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: tx })
  } catch (error) {
    console.error('M-Pesa status error:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
