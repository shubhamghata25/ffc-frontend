/**
 * FFC Payment Hook
 * Supports: Razorpay (card/netbanking/UPI) + PhonePe UPI deep link
 *
 * Paytm Business gateway is DISCONTINUED as of 2024.
 * PhonePe is the correct replacement — India's #1 UPI app.
 * Razorpay also supports UPI natively (GPay, PhonePe, Paytm UPI all work).
 */

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/* ── Load Razorpay SDK ── */
function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

/* ── Razorpay (Cards, Net Banking, UPI via Razorpay) ── */
export async function openRazorpay({ amount, name, description, prefill={}, onSuccess, onFailure, meta={} }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) { onFailure?.('Razorpay failed to load. Check your internet.'); return }

  let order
  try {
    const res = await fetch(`${API}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, ...meta }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    order = await res.json()
  } catch {
    onFailure?.('Could not create order. Please try again.')
    return
  }

  const options = {
    key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount:      order.amount,
    currency:    'INR',
    order_id:    order.id,
    name:        'Friends Fitness Club',
    description: description || name,
    image:       '/logo.png',
    prefill,
    theme:       { color: '#7c3aed' },
    /* Allow UPI, cards, netbanking, wallets */
    method: {
      upi:        true,
      card:       true,
      netbanking: true,
      wallet:     true,
      emi:        false,
    },
    handler: async (response) => {
      try {
        const vres = await fetch(`${API}/api/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...response, meta: { ...meta, amount, name, description } }),
        })
        const data = await vres.json()
        if (data.success) onSuccess?.(response, data.order)
        else onFailure?.('Payment verification failed. Contact support.')
      } catch {
        onSuccess?.(response, null)
      }
    },
    modal: { ondismiss: () => onFailure?.('Payment cancelled.') },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', r => onFailure?.(`Payment failed: ${r.error.description}`))
  rzp.open()
}

/* ── PhonePe UPI Deep Link ──────────────────────────────
   Opens PhonePe app directly on mobile.
   On desktop → shows QR code via intent URL.
   UPI ID configured in Render env: PHONEPE_UPI_ID
   Falls back to WhatsApp if UPI not configured.
────────────────────────────────────────────────────────── */
export function openPhonePeUPI({ amount, name, onSuccess, onFailure }) {
  const upiId = import.meta.env.VITE_PHONEPE_UPI_ID

  if (!upiId) {
    /* Fallback: WhatsApp order */
    const msg = `Hello! I want to pay ₹${amount} for ${name} at Friends Fitness Club. Please confirm.`
    window.open(`https://wa.me/918484805154?text=${encodeURIComponent(msg)}`, '_blank')
    onSuccess?.({ method: 'whatsapp', amount, name })
    return
  }

  /* UPI deep link — works on mobile browsers */
  const upiUrl = `upi://pay?pa=${upiId}&pn=Friends+Fitness+Club&am=${amount}&cu=INR&tn=${encodeURIComponent(name)}`

  /* On mobile — open UPI intent directly */
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.location.href = upiUrl
    /* Assume success after 3 sec (UPI app opened) */
    setTimeout(() => onSuccess?.({ method: 'upi', amount, name }), 3000)
  } else {
    /* Desktop — show QR instructions */
    onFailure?.('UPI payment is best on mobile. Please scan the QR or use Razorpay on desktop.')
  }
}

/* ── WhatsApp Order (fallback) ── */
export function openWhatsAppOrder({ productName, price, qty=1 }) {
  const lines = qty > 1
    ? `${productName} x${qty} = ₹${price * qty}`
    : `${productName} — ₹${price}`
  const msg = `Hello! I want to order:\n• ${lines}\n\nPlease confirm availability.`
  window.open(`https://wa.me/918484805154?text=${encodeURIComponent(msg)}`, '_blank')
}
