import React, { useState, useEffect } from 'react'
import { openRazorpay, openPhonePeUPI } from '../hooks/usePayment.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/* ─── Payment method modal ─── */
function PayModal({ plan, onClose, onDone }) {
  const [method, setMethod] = useState(null)   // null | 'razorpay' | 'upi'
  const [paying, setPaying] = useState(false)
  const { toasts, success, error, info } = useToast()

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)

  async function payRazorpay() {
    setPaying(true)
    info('Opening payment…')
    await openRazorpay({
      amount:      plan.price,
      name:        `${plan.label} Membership`,
      description: `FFC ${plan.label} — ₹${plan.price}`,
      meta:        { type:'membership', itemId:plan.id, itemName:plan.label },
      onSuccess: (resp) => {
        success(`✅ Payment successful! ID: ${resp.razorpay_payment_id}`)
        setTimeout(() => { setPaying(false); onDone?.() }, 1500)
      },
      onFailure: (msg) => {
        if (!msg.includes('cancelled')) error(msg)
        setPaying(false)
      },
    })
    setPaying(false)
  }

  function payUPI() {
    setPaying(true)
    info(isMobile ? 'Opening UPI app…' : 'UPI is best on mobile. Opening WhatsApp instead…')
    openPhonePeUPI({
      amount: plan.price,
      name:   `${plan.label} Membership`,
      onSuccess: () => {
        success('✅ UPI payment initiated! Share screenshot on WhatsApp to confirm.')
        setPaying(false); onDone?.()
      },
      onFailure: (msg) => { error(msg); setPaying(false) },
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(145deg,#130f24,#1a1535)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:20,padding:'clamp(22px,4vw,36px)',width:'100%',maxWidth:420,position:'relative' }}>

          {/* Close */}
          <button onClick={onClose} style={{ position:'absolute',top:14,right:16,background:'none',border:'none',color:'#6b6490',fontSize:22,cursor:'pointer',lineHeight:1 }}>✕</button>

          {/* Plan summary */}
          <div style={{ textAlign:'center',marginBottom:26 }}>
            <div style={{ fontSize:12,color:'#9c59f7',fontWeight:700,letterSpacing:2,marginBottom:6,textTransform:'uppercase' }}>Complete Your Purchase</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1 }}>{plan.label} Membership</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:48,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1.1 }}>₹{plan.price.toLocaleString()}</div>
            <div style={{ color:'#6b6490',fontSize:12,marginTop:2 }}>per {plan.period}</div>
          </div>

          {/* Choose payment method */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

            {/* Razorpay — cards, UPI, netbanking */}
            <button onClick={payRazorpay} disabled={paying} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:paying?'rgba(124,58,237,0.2)':'rgba(124,58,237,0.12)',border:'2px solid rgba(124,58,237,0.35)',borderRadius:14,cursor:paying?'not-allowed':'pointer',transition:'all .2s',textAlign:'left',color:'#f0eeff',width:'100%',opacity:paying?0.7:1 }}>
              <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#9c59f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>💳</div>
              <div>
                <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>Card / Net Banking / UPI</div>
                <div style={{ fontSize:11,color:'#9c59f7' }}>Razorpay — All major banks, GPay, PhonePe, Paytm UPI</div>
              </div>
              <div style={{ marginLeft:'auto',color:'#9c59f7',fontSize:18 }}>›</div>
            </button>

            {/* PhonePe direct UPI */}
            <button onClick={payUPI} disabled={paying} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:paying?'rgba(99,102,241,0.1)':'rgba(99,102,241,0.08)',border:'2px solid rgba(99,102,241,0.25)',borderRadius:14,cursor:paying?'not-allowed':'pointer',transition:'all .2s',textAlign:'left',color:'#f0eeff',width:'100%',opacity:paying?0.7:1 }}>
              <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#5c35cc,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>📱</div>
              <div>
                <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>UPI / PhonePe Direct</div>
                <div style={{ fontSize:11,color:'#818cf8' }}>{isMobile ? 'Opens UPI app directly on your phone' : 'Best on mobile — opens PhonePe/GPay'}</div>
              </div>
              <div style={{ marginLeft:'auto',color:'#818cf8',fontSize:18 }}>›</div>
            </button>

            {/* WhatsApp confirm */}
            <button onClick={()=>{ const m=`Hello! I want to join FFC ${plan.label} plan for ₹${plan.price}. Please confirm my enrollment.`; window.open(`https://wa.me/918484805154?text=${encodeURIComponent(m)}`,'_blank'); onClose() }}
              disabled={paying}
              style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'rgba(37,211,102,0.08)',border:'2px solid rgba(37,211,102,0.2)',borderRadius:14,cursor:'pointer',transition:'all .2s',textAlign:'left',color:'#f0eeff',width:'100%',opacity:paying?0.7:1 }}>
              <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>💬</div>
              <div>
                <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>WhatsApp Enquiry</div>
                <div style={{ fontSize:11,color:'#4ade80' }}>Chat with us to confirm &amp; pay manually</div>
              </div>
              <div style={{ marginLeft:'auto',color:'#4ade80',fontSize:18 }}>›</div>
            </button>
          </div>

          <p style={{ textAlign:'center',marginTop:18,fontSize:11,color:'#4b4570' }}>🔒 All payments are 100% secure &amp; encrypted</p>
        </div>
      </div>
      <ToastContainer toasts={toasts}/>
    </>
  )
}

/* ─── Plan Card ─── */
function PlanCard({ plan, onSelect }) {
  const discounted = plan.originalPrice && plan.originalPrice > plan.price
  const saving     = discounted ? plan.originalPrice - plan.price : 0

  return (
    <div style={{
      background:   plan.popular ? 'linear-gradient(145deg,#1a0a3e,#2d1260)' : 'linear-gradient(145deg,#130f24,#1a1535)',
      borderRadius: 'clamp(14px,2vw,24px)',
      padding:      'clamp(22px,3vw,36px) clamp(16px,2.5vw,28px)',
      textAlign:    'center',
      position:     'relative',
      border:       plan.popular ? '2px solid rgba(156,89,247,0.7)' : '1px solid rgba(124,58,237,0.15)',
      boxShadow:    plan.popular ? '0 0 48px rgba(124,58,237,0.3)' : 'none',
      transition:   'transform .3s,box-shadow .3s',
      display:      'flex', flexDirection:'column',
    }}
      onMouseEnter={e=>{ if(!plan.popular){ e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(124,58,237,0.2)' } }}
      onMouseLeave={e=>{ if(!plan.popular){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' } }}>

      {plan.popular && (
        <div style={{ position:'absolute',top:-15,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#7c3aed,#9c59f7)',color:'#fff',borderRadius:20,padding:'5px 20px',fontSize:11,fontWeight:800,letterSpacing:1.5,whiteSpace:'nowrap',boxShadow:'0 4px 16px rgba(124,58,237,0.5)' }}>
          ⭐ MOST POPULAR
        </div>
      )}

      {plan.discount > 0 && (
        <div style={{ position:'absolute',top:14,right:14,background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',color:'#4ade80',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700 }}>
          {plan.discountType==='flat' ? `₹${plan.discount} OFF` : `${plan.discount}% OFF`}
        </div>
      )}

      <h2 style={{ color:'#bb86fc',fontSize:'clamp(16px,2.5vw,19px)',marginBottom:4,fontWeight:700 }}>{plan.label}</h2>
      <p style={{ color:'rgba(184,176,212,0.5)',fontSize:12,marginBottom:16 }}>per {plan.period}</p>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(48px,8vw,60px)',letterSpacing:2,lineHeight:1,background:'linear-gradient(135deg,#f0eeff,#bb86fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
          ₹{plan.price.toLocaleString()}
        </div>
        {discounted && (
          <div style={{ color:'rgba(184,176,212,0.4)',fontSize:13,textDecoration:'line-through',marginTop:4 }}>
            ₹{plan.originalPrice.toLocaleString()}
            {saving>0 && <span style={{ color:'#4ade80',textDecoration:'none',marginLeft:8,fontWeight:600 }}>Save ₹{saving}</span>}
          </div>
        )}
      </div>

      {plan.description && (
        <p style={{ color:'rgba(184,176,212,0.5)',fontSize:'clamp(11px,1.5vw,13px)',marginBottom:16,lineHeight:1.6 }}>{plan.description}</p>
      )}

      <ul style={{ listStyle:'none',marginBottom:24,textAlign:'left',flex:1 }}>
        {(plan.features||[]).map(f=>(
          <li key={f} style={{ color:'rgba(240,238,255,0.75)',fontSize:'clamp(11px,1.5vw,13px)',marginBottom:8,display:'flex',alignItems:'flex-start',gap:8,lineHeight:1.5 }}>
            <span style={{ color:'#9c59f7',fontWeight:700,flexShrink:0,marginTop:1 }}>✓</span>{f}
          </li>
        ))}
      </ul>

      <button onClick={() => onSelect(plan)}
        style={{ width:'100%',padding:'clamp(10px,1.5vw,13px)',border:'none',borderRadius:40,background:'linear-gradient(135deg,#7c3aed,#9c59f7)',color:'#fff',fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:'clamp(13px,1.6vw,14px)',cursor:'pointer',transition:'all .2s',boxShadow:'0 4px 20px rgba(124,58,237,0.4)',letterSpacing:.3 }}>
        Choose Plan →
      </button>
    </div>
  )
}

/* ─── Main Pricing Page ─── */
export default function Pricing() {
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)   // plan to pay for

  const loadPlans = () => {
    fetch(`${API}/api/plans`).then(r=>r.json()).then(d=>{ setPlans(d); setLoading(false) }).catch(()=>setLoading(false))
  }
  useEffect(loadPlans,[])

  return (
    <div className="page-wrapper">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:480px){
          .plan-grid-inner{ grid-template-columns:1fr !important; max-width:360px !important; }
        }
      `}</style>

      <section className="section" style={{ textAlign:'center' }}>
        <div className="accent-line" style={{ margin:'0 auto 14px' }}/>
        <h1 className="section-title">
          Membership <span style={{ background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>Plans</span>
        </h1>
        <p className="section-sub" style={{ margin:'0 auto clamp(32px,5vw,56px)' }}>
          No hidden fees. Cancel anytime. Pick the plan that fits your journey.
        </p>

        {loading && (
          <div style={{ padding:'clamp(40px,8vw,60px)' }}>
            <div style={{ width:40,height:40,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px' }}/>
            <p style={{ color:'var(--muted)' }}>Loading plans…</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="plan-grid plan-grid-inner" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:'clamp(14px,2vw,24px)',maxWidth:1100,margin:'0 auto' }}>
              {plans.map(plan => <PlanCard key={plan.id} plan={plan} onSelect={setSelected}/>)}
              {plans.length===0 && <p style={{ color:'var(--muted)',gridColumn:'1/-1',padding:40 }}>No plans available.</p>}
            </div>

            {/* Payment methods banner */}
            <div style={{ marginTop:'clamp(28px,4vw,44px)',padding:'clamp(14px,2vw,20px) clamp(16px,3vw,28px)',background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:16,display:'inline-flex',flexWrap:'wrap',gap:'clamp(12px,2vw,24px)',alignItems:'center',justifyContent:'center' }}>
              <span style={{ color:'#6b6490',fontSize:12,fontWeight:600,letterSpacing:1,textTransform:'uppercase' }}>Accepted payments</span>
              {[
                { icon:'💳', label:'Visa / Mastercard' },
                { icon:'🏦', label:'Net Banking' },
                { icon:'📱', label:'PhonePe UPI' },
                { icon:'🟣', label:'GPay / Paytm UPI' },
                { icon:'💬', label:'WhatsApp' },
              ].map(p=>(
                <div key={p.label} style={{ display:'flex',alignItems:'center',gap:6,fontSize:'clamp(11px,1.5vw,13px)',color:'#b8b0d4',fontWeight:500 }}>
                  <span>{p.icon}</span>{p.label}
                </div>
              ))}
            </div>

            {/* Perks */}
            <div style={{ display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'clamp(12px,2vw,24px)',marginTop:'clamp(18px,3vw,28px)' }}>
              {['🔒 Secure Payments','💯 No Hidden Charges','🔄 Easy Renewal','📞 24/7 Support'].map(p=>(
                <div key={p} style={{ color:'rgba(184,176,212,0.5)',fontSize:'clamp(11px,1.4vw,13px)' }}>{p}</div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Payment method modal */}
      {selected && (
        <PayModal
          plan={selected}
          onClose={() => setSelected(null)}
          onDone={() => setSelected(null)}
        />
      )}
    </div>
  )
}
