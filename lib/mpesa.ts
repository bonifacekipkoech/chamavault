/**
 * M-Pesa Daraja API Integration
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 *
 * Uses STK Push (Lipa Na M-Pesa Online) to prompt members to pay
 * directly from their phone — no need to visit a till.
 */

const DARAJA_BASE =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

// ─── Token ────────────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getDarajaToken(): Promise<string> {
  // Return cached token if still valid (expires in 3600s, refresh at 3500)
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY!
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  const res = await fetch(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )

  if (!res.ok) throw new Error('Failed to get M-Pesa token')

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3500 * 1000,
  }

  return cachedToken.token
}

// ─── STK Push (C2B) ───────────────────────────────────────────────────────────

export interface STKPushParams {
  phone: string           // e.g. "254712345678"
  amount: number          // KES (whole number)
  accountReference: string // e.g. "CHAMA-CONTRIB-123"
  transactionDesc: string  // e.g. "March 2024 Contribution"
}

export interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export async function initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
  const token = await getDarajaToken()
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/mpesa/callback`

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  // Normalise phone: strip leading 0 and add 254
  const phone = params.phone.replace(/^0/, '254').replace(/^\+/, '')

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(params.amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.transactionDesc.slice(0, 13),
  }

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`STK Push failed: ${err}`)
  }

  return res.json()
}

// ─── STK Query ────────────────────────────────────────────────────────────────

export async function querySTKStatus(checkoutRequestId: string) {
  const token = await getDarajaToken()
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  })

  return res.json()
}

// ─── B2C (Loan Disbursement) ──────────────────────────────────────────────────

export async function disburseLoan({
  phone,
  amount,
  occasion,
  remarks,
}: {
  phone: string
  amount: number
  occasion: string
  remarks: string
}) {
  const token = await getDarajaToken()
  const shortcode = process.env.MPESA_B2C_SHORTCODE!
  const initiatorName = process.env.MPESA_INITIATOR_NAME!
  const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD!
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/mpesa/b2c-callback`

  const normalised = phone.replace(/^0/, '254').replace(/^\+/, '')

  const res = await fetch(`${DARAJA_BASE}/mpesa/b2c/v3/paymentrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      OriginatorConversationID: `LOAN-${Date.now()}`,
      InitiatorName: initiatorName,
      SecurityCredential: initiatorPassword,
      CommandID: 'BusinessPayment',
      Amount: Math.round(amount),
      PartyA: shortcode,
      PartyB: normalised,
      Remarks: remarks.slice(0, 100),
      QueueTimeOutURL: callbackUrl,
      ResultURL: callbackUrl,
      Occasion: occasion.slice(0, 100),
    }),
  })

  return res.json()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise Kenyan phone to international format */
export function normalisePhone(phone: string): string {
  return phone.replace(/^0/, '254').replace(/^\+/, '').replace(/\s/g, '')
}

/** Format phone for display: 0712 345 678 */
export function formatPhone(phone: string): string {
  const local = phone.startsWith('254') ? '0' + phone.slice(3) : phone
  return local.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
}
