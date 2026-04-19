import React, { useState } from 'react'

const PLANS = [
  { label:'Monthly',    price:1199, period:'month',  popular:false, features:['Full gym access','Locker facility','Diet consultation','Group classes'] },
  { label:'Quarterly',  price:2999, period:'3 months',popular:true,  features:['Full gym access','Locker facility','Diet consultation','Group classes','1 Personal session'] },
  { label:'Half Yearly',price:4999, period:'6 months',popular:false, features:['Full gym access','Locker facility','Diet consultation','Group classes','2 Personal sessions','Body analysis'] },
  { label:'Yearly',     price:9999, period:'year',    popular:false, features:['Full gym access','Locker facility','Diet consultation','Group classes','5 Personal sessions','Body analysis','Priority support'] },
]

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const [loading, setLoading] = useState(null)

  async function payNow(plan) {
    setLoading(plan.label)
    const ok = await loadRazorpay()
    if (!ok) { alert('Razorpay failed to load. Check internet.'); setLoading(null); return }

    try {
      /* create order from backend */
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/create-order`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amount: plan.price }),
      })
      const order = await res.json()

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        order_id: order.id,
        name: 'Friends Fitness Club',
        description: `${plan.label} Membership`,
        image: 'https://friends-fitness-club.vercel.app/logo.png',
        handler: (response) => {
          alert(`✅ Payment successful!\nPayment ID: ${response.razorpay_payment_id}`)
        },
        prefill: { name:'', email:'', contact:'' },
        theme: { color:'#ff3c00' },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch(e) {
      alert('Payment initialization failed. Please try again.')
    }
    setLoading(null)
  }

  return (
    <div className="page-wrapper">
      <section className="section" style={{ textAlign:'center' }}>
        <div className="fade-up">
          <h1 className="section-title">Membership Plans</h1>
          <p className="section-sub" style={{ margin:'0 auto 60px' }}>
            No hidden fees. Cancel anytime. Pick the plan that fits your journey.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:24, maxWidth:1100, margin:'0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.label} className="card" style={{
              padding:'36px 28px', textAlign:'center', position:'relative',
              border: plan.popular ? '2px solid #ff3c00' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: plan.popular ? '0 0 40px rgba(255,60,0,0.3)' : 'none',
            }}>
              {plan.popular && (
                <div style={{
                  position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
                  background:'#ff3c00', color:'#fff', borderRadius:20, padding:'4px 18px',
                  fontSize:12, fontWeight:700, letterSpacing:1, whiteSpace:'nowrap',
                }}>⭐ MOST POPULAR</div>
              )}

              <h2 style={{ color:'#ff3c00', fontSize:20, marginBottom:6 }}>{plan.label}</h2>
              <p style={{ color:'#666', fontSize:13, marginBottom:20 }}>per {plan.period}</p>

              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:58, letterSpacing:2, marginBottom:28 }}>
                ₹{plan.price.toLocaleString()}
              </div>

              <ul style={{ listStyle:'none', marginBottom:32, textAlign:'left' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ color:'#ccc', fontSize:14, marginBottom:10, paddingLeft:8 }}>
                    <span style={{ color:'#ff3c00', marginRight:8 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <button className="btn" onClick={() => payNow(plan)} disabled={loading===plan.label}
                style={{ width:'100%', justifyContent:'center', opacity:loading===plan.label?0.7:1 }}>
                {loading===plan.label
                  ? <span style={{ width:18,height:18,border:'2px solid #fff4',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}} />
                  : 'Pay Now'}
              </button>
            </div>
          ))}
        </div>

        {/* Perks */}
        <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:32, marginTop:60 }}>
          {['🔒 Secure Payments','💯 No Hidden Charges','🔄 Easy Renewal','📞 24/7 Support'].map(p => (
            <div key={p} style={{ color:'#888', fontSize:14 }}>{p}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
