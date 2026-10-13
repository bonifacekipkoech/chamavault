'use client'

import { useState } from 'react'
import axios from 'axios'
import { Loader2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatKES } from '@/lib/utils'

interface MpesaPayButtonProps {
  contributionId: string
  amount: number
  phone: string
  onSuccess?: () => void
}

type State = 'idle' | 'pushing' | 'waiting' | 'success' | 'error'

export function MpesaPayButton({ contributionId, amount, phone, onSuccess }: MpesaPayButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const initiatePush = async () => {
    setState('pushing')
    setErrorMsg('')
    try {
      const res = await axios.post('/api/mpesa/stk-push', { contributionId, phone })
      setCheckoutId(res.data.data.checkoutRequestId)
      setState('waiting')

      // Poll for status every 3 seconds for up to 60 seconds
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const statusRes = await axios.get(`/api/mpesa/status?checkoutRequestId=${res.data.data.checkoutRequestId}`)
          const txStatus = statusRes.data.data?.status

          if (txStatus === 'SUCCESS') {
            clearInterval(poll)
            setState('success')
            onSuccess?.()
          } else if (txStatus === 'FAILED' || txStatus === 'CANCELLED') {
            clearInterval(poll)
            setState('error')
            setErrorMsg('Payment was cancelled or failed. Please try again.')
          }
        } catch {}

        if (attempts >= 20) {
          clearInterval(poll)
          // Don't error — payment may still arrive via callback
          setState('idle')
        }
      }, 3000)
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.response?.data?.error ?? 'Failed to initiate M-Pesa payment')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Payment confirmed
      </div>
    )
  }

  if (state === 'waiting') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
        <div>
          <p className="font-medium">Check your phone</p>
          <p className="text-xs text-gray-400">Enter your M-Pesa PIN to pay {formatKES(amount)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={initiatePush}
        disabled={state === 'pushing'}
        className="btn-mpesa btn-sm gap-2"
      >
        {state === 'pushing'
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Smartphone className="w-3.5 h-3.5" />
        }
        Pay via M-Pesa
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errorMsg}
        </p>
      )}
    </div>
  )
}
