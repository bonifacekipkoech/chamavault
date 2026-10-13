import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/mpesa/callback
 * Safaricom calls this endpoint when STK push completes (success or failure).
 * Must respond within 5 seconds with { ResultCode: 0, ResultDesc: "Accepted" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const stkCallback = body?.Body?.stkCallback

    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback

    const transaction = await db.mpesaTransaction.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    })

    if (!transaction) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const succeeded = ResultCode === 0

    // Extract M-Pesa receipt number from metadata
    let mpesaReceiptNumber: string | null = null
    let amount: number = transaction.amount

    if (succeeded && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value
        if (item.Name === 'Amount') amount = item.Value
      }
    }

    await db.$transaction(async tx => {
      await tx.mpesaTransaction.update({
        where: { id: transaction.id },
        data: {
          status: succeeded ? 'SUCCESS' : 'FAILED',
          mpesaReceiptNumber,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        },
      })

      if (succeeded && transaction.contributionId) {
        const contribution = await tx.contribution.findUnique({
          where: { id: transaction.contributionId },
        })

        if (contribution) {
          const newPaid = contribution.paidAmount + amount
          const newStatus = newPaid >= contribution.expectedAmount ? 'PAID' : 'PARTIAL'

          await tx.contribution.update({
            where: { id: contribution.id },
            data: {
              paidAmount: newPaid,
              status: newStatus,
              paidAt: new Date(),
              mpesaRef: mpesaReceiptNumber,
              mpesaPhone: transaction.phoneNumber,
            },
          })

          // Update member totals + chama treasury
          await tx.member.update({
            where: { id: contribution.memberId },
            data: { totalContributed: { increment: amount } },
          })

          await tx.chama.update({
            where: { id: transaction.chamaId },
            data: { treasuryBalance: { increment: amount } },
          })

          await tx.auditLog.create({
            data: {
              action: 'CONTRIBUTION_PAID_VIA_MPESA',
              entityType: 'Contribution',
              entityId: contribution.id,
              chamaId: transaction.chamaId,
              details: { amount, mpesaRef: mpesaReceiptNumber },
            },
          })
        }
      }
    })

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('M-Pesa callback error:', error)
    // Still return 200 so Safaricom doesn't retry indefinitely
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
