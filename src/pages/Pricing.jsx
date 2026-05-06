import React, { useState, useEffect, useRef } from 'react'
import { openRazorpay, openPhonePeUPI } from '../hooks/usePayment.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/* ─── Payment method modal ─── */
function PayModal({ plan, onClose, onDone }) {
  const [step, setStep]   = useState('details')   // 'details' | 'method'
  const [paying, setPaying] = useState(false)
  const [form, setForm]   = useState({ name:'', email:'', phone:'' })
  const { toasts, success, error, info } = useToast()
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim().length > 1 && form.phone.replace(/\D/g,'').length >= 10

  const inpStyle = {
    width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(124,58,237,0.35)', borderRadius:10, color:'#f0eeff',
    fontFamily:"'Poppins',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box',
  }

  async function payRazorpay() {
    setPaying(true)
    info('Opening payment gateway...')
    await openRazorpay({
      amount:      plan.price,
      name:        `${plan.label} Membership`,
      description: `FFC ${plan.label} - Rs.${plan.price}`,
      prefill:     { name: form.name, email: form.email, contact: form.phone },
      meta: {
        type:'membership', itemId:plan.id, itemName:plan.label,
        memberName:form.name, memberEmail:form.email, memberPhone:form.phone,
        planLabel:plan.label, planPeriod:plan.period, planPrice:plan.price,
      },
      onSuccess: () => {
        success('Payment successful! Check your email for confirmation and QR code.')
        setTimeout(() => { setPaying(false); onDone?.() }, 2500)
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
    info(isMobile ? 'Opening UPI app...' : 'UPI is best on mobile.')
    openPhonePeUPI({
      amount: plan.price,
      name:   `${plan.label} Membership`,
      onSuccess: () => {
        success('UPI payment initiated! Share screenshot on WhatsApp to confirm.')
        setPaying(false); onDone?.()
      },
      onFailure: (msg) => { error(msg); setPaying(false) },
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0' }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(145deg,#130f24,#1a1535)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'20px 20px 0 0',padding:'clamp(20px,4vw,32px)',width:'100%',maxWidth:440,position:'relative',maxHeight:'92vh',overflowY:'auto' }}>

          <button onClick={onClose} style={{ position:'absolute',top:14,right:16,background:'none',border:'none',color:'#6b6490',fontSize:22,cursor:'pointer' }}>✕</button>

          {/* Plan summary */}
          <div style={{ textAlign:'center',marginBottom:20 }}>
            <div style={{ fontSize:11,color:'#9c59f7',fontWeight:700,letterSpacing:2,marginBottom:6,textTransform:'uppercase' }}>
              {step==='details' ? 'Step 1 of 2 — Your Details' : 'Step 2 of 2 — Payment'}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1 }}>{plan.label} Membership</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:44,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1.1 }}>
              Rs.{plan.price.toLocaleString()}
            </div>
            <div style={{ color:'#6b6490',fontSize:12,marginTop:2 }}>per {plan.period}</div>
          </div>

          {/* STEP 1: Member details */}
          {step === 'details' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div>
                <label style={{ fontSize:11,color:'#6b6490',display:'block',marginBottom:5 }}>Full Name *</label>
                <input value={form.name} onChange={e=>setF('name',e.target.value)}
                  placeholder="e.g. Rahul Sharma" style={inpStyle}/>
              </div>
              <div>
                <label style={{ fontSize:11,color:'#6b6490',display:'block',marginBottom:5 }}>Phone Number *</label>
                <input value={form.phone} onChange={e=>setF('phone',e.target.value)}
                  placeholder="10-digit mobile number" type="tel" style={inpStyle}/>
              </div>
              <div>
                <label style={{ fontSize:11,color:'#6b6490',display:'block',marginBottom:5 }}>Email Address</label>
                <input value={form.email} onChange={e=>setF('email',e.target.value)}
                  placeholder="your@email.com" type="email" style={inpStyle}/>
                <p style={{ fontSize:11,color:'#7c3aed',marginTop:6,lineHeight:1.5 }}>
                  Your QR attendance code + confirmation will be sent here
                </p>
              </div>
              <button onClick={() => setStep('method')} disabled={!valid}
                style={{ padding:'14px',border:'none',borderRadius:40,background:valid?'linear-gradient(135deg,#7c3aed,#9c59f7)':'rgba(124,58,237,0.2)',color:'#fff',fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:15,cursor:valid?'pointer':'not-allowed',marginTop:4 }}>
                Continue to Payment →
              </button>
              {!valid && <p style={{ textAlign:'center',fontSize:11,color:'#6b6490' }}>Name and phone number are required</p>}
            </div>
          )}

          {/* STEP 2: Payment methods */}
          {step === 'method' && (
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#4ade80',marginBottom:4 }}>
                Paying as: <strong>{form.name}</strong> · {form.phone}
              </div>

              <button onClick={payRazorpay} disabled={paying} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:paying?'rgba(124,58,237,0.2)':'rgba(124,58,237,0.12)',border:'2px solid rgba(124,58,237,0.35)',borderRadius:14,cursor:paying?'not-allowed':'pointer',textAlign:'left',color:'#f0eeff',width:'100%',opacity:paying?0.7:1 }}>
                <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#9c59f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>💳</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>Card / Net Banking / UPI</div>
                  <div style={{ fontSize:11,color:'#9c59f7' }}>Razorpay — GPay, PhonePe, Paytm, all cards</div>
                </div>
                <div style={{ marginLeft:'auto',color:'#9c59f7',fontSize:18 }}>›</div>
              </button>

              <button onClick={payUPI} disabled={paying} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'rgba(99,102,241,0.08)',border:'2px solid rgba(99,102,241,0.25)',borderRadius:14,cursor:paying?'not-allowed':'pointer',textAlign:'left',color:'#f0eeff',width:'100%',opacity:paying?0.7:1 }}>
                <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#5c35cc,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>📱</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>UPI / PhonePe Direct</div>
                  <div style={{ fontSize:11,color:'#818cf8' }}>{isMobile ? 'Opens UPI app directly' : 'Best on mobile'}</div>
                </div>
                <div style={{ marginLeft:'auto',color:'#818cf8',fontSize:18 }}>›</div>
              </button>

              <button onClick={()=>{ const m=`Hello! I want to join FFC ${plan.label} plan for Rs.${plan.price}. Name: ${form.name}, Phone: ${form.phone}`; window.open(`https://wa.me/918484805154?text=${encodeURIComponent(m)}`,'_blank'); onClose() }}
                disabled={paying}
                style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'rgba(37,211,102,0.08)',border:'2px solid rgba(37,211,102,0.2)',borderRadius:14,cursor:'pointer',textAlign:'left',color:'#f0eeff',width:'100%' }}>
                <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>💬</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>WhatsApp Enquiry</div>
                  <div style={{ fontSize:11,color:'#4ade80' }}>Chat with us to confirm and pay manually</div>
                </div>
                <div style={{ marginLeft:'auto',color:'#4ade80',fontSize:18 }}>›</div>
              </button>

              <button onClick={()=>setStep('details')} style={{ background:'none',border:'none',color:'#6b6490',fontSize:12,cursor:'pointer',padding:'4px',textDecoration:'underline',textAlign:'center' }}>
                ← Edit details
              </button>
            </div>
          )}

          <p style={{ textAlign:'center',marginTop:18,fontSize:11,color:'#4b4570' }}>
            All payments are 100% secure and encrypted
          </p>
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
  const [offer,   setOffer]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)
  const ptRef = useRef(null)

  const loadPlans = () => {
    fetch(`${API}/api/plans`).then(r=>r.json()).then(d=>{ setPlans(d); setLoading(false) }).catch(()=>setLoading(false))
  }
  useEffect(loadPlans,[])
  useEffect(()=>{
    fetch(`${API}/api/offer`).then(r=>r.json()).then(d=>{ if(d&&d.status==='ON') setOffer(d) }).catch(()=>{})
  },[])

  // Scroll to PT section if hash present
  useEffect(()=>{
    if(!loading && window.location.hash==='#personal-trainers' && ptRef.current){
      setTimeout(()=>ptRef.current.scrollIntoView({behavior:'smooth',block:'start'}),200)
    }
  },[loading])

  const membershipPlans = plans.filter(p => !p.ptPlan)
  const ptPlans         = plans.filter(p => p.ptPlan)

  return (
    <div className="page-wrapper">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:480px){
          .plan-grid-inner{ grid-template-columns:1fr !important; max-width:360px !important; }
        }
      `}</style>

      {/* ─── OFFER BANNER ─── */}
      {offer && (
        <section style={{borderBottom:'1px solid rgba(124,58,237,0.2)',position:'relative',overflow:'hidden'}}>
          {offer.poster
            ? <div style={{position:'relative'}}>
                <img src={offer.poster} alt={offer.title} style={{width:'100%',height:'clamp(180px,40vw,380px)',objectFit:'cover',objectPosition:'center',display:'block'}}/>
                <div style={{position:'absolute',inset:0,background:'rgba(6,5,15,0.62)'}}/>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px 6%',textAlign:'center'}}>
                  <div className="badge-purple" style={{marginBottom:10,fontSize:11,letterSpacing:2}}>🔥 LIMITED TIME OFFER</div>
                  <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(22px,5vw,52px)',letterSpacing:2,marginBottom:8}}>{offer.title}</h2>
                  <p style={{color:'rgba(240,238,255,0.82)',marginBottom:18,fontSize:'clamp(13px,2vw,16px)',lineHeight:1.6,maxWidth:480}}>{offer.description}</p>
                </div>
              </div>
            : <div style={{background:'linear-gradient(135deg,#1a0a3e,#0d0b1a)',padding:'clamp(24px,4vw,40px) 8%',textAlign:'center',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 50%,rgba(124,58,237,0.18) 0%,transparent 65%)',pointerEvents:'none'}}/>
                <div className="badge-purple" style={{marginBottom:10,position:'relative'}}>🔥 LIMITED TIME OFFER</div>
                <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(24px,5vw,52px)',letterSpacing:2,marginBottom:8,position:'relative'}}>{offer.title}</h2>
                <p style={{color:'rgba(240,238,255,0.8)',marginBottom:0,fontSize:'clamp(13px,2vw,16px)',lineHeight:1.6,position:'relative'}}>{offer.description}</p>
              </div>
          }
        </section>
      )}

      {/* ─── SECTION 1: MEMBERSHIP PLANS ─── */}
      <section className="section" style={{textAlign:'center'}}>
        <div className="accent-line" style={{margin:'0 auto 14px'}}/>
        <h1 className="section-title">
          Membership <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Plans</span>
        </h1>
        <p className="section-sub" style={{margin:'0 auto clamp(32px,5vw,48px)'}}>
          No hidden fees. Cancel anytime. Pick the plan that fits your journey.
        </p>

        {loading && (
          <div style={{padding:'clamp(40px,8vw,60px)'}}>
            <div style={{width:40,height:40,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px'}}/>
            <p style={{color:'var(--muted)'}}>Loading plans…</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="plan-grid plan-grid-inner" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:'clamp(14px,2vw,24px)',maxWidth:1100,margin:'0 auto'}}>
              {membershipPlans.map(plan => <PlanCard key={plan.id} plan={plan} onSelect={setSelected}/>)}
              {membershipPlans.length===0 && <p style={{color:'var(--muted)',gridColumn:'1/-1',padding:40}}>No membership plans available.</p>}
            </div>

            {/* Payment methods banner */}
            <div style={{marginTop:'clamp(28px,4vw,44px)',padding:'clamp(14px,2vw,20px) clamp(16px,3vw,28px)',background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:16,display:'inline-flex',flexWrap:'wrap',gap:'clamp(12px,2vw,24px)',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#6b6490',fontSize:12,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Accepted payments</span>
              {[{icon:'💳',label:'Visa / Mastercard'},{icon:'🏦',label:'Net Banking'},{icon:'📱',label:'PhonePe UPI'},{icon:'🟣',label:'GPay / Paytm UPI'},{icon:'💬',label:'WhatsApp'}].map(p=>(
                <div key={p.label} style={{display:'flex',alignItems:'center',gap:6,fontSize:'clamp(11px,1.5vw,13px)',color:'#b8b0d4',fontWeight:500}}>
                  <span>{p.icon}</span>{p.label}
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'clamp(12px,2vw,24px)',marginTop:'clamp(18px,3vw,28px)'}}>
              {['🔒 Secure Payments','💯 No Hidden Charges','🔄 Easy Renewal','📞 24/7 Support'].map(p=>(
                <div key={p} style={{color:'rgba(184,176,212,0.5)',fontSize:'clamp(11px,1.4vw,13px)'}}>{p}</div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── SECTION 2: PERSONAL TRAINER PLANS ─── */}
      <section id="personal-trainers" ref={ptRef} style={{background:'rgba(13,11,26,0.95)',padding:'clamp(48px,8vw,80px) 6%',borderTop:'1px solid rgba(124,58,237,0.15)',textAlign:'center'}}>
        <div className="accent-line" style={{margin:'0 auto 14px'}}/>
        <h2 className="section-title">
          Personal <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Trainer Plans</span>
        </h2>
        <p className="section-sub" style={{margin:'0 auto clamp(28px,4vw,44px)'}}>
          One-on-one coaching with certified trainers. Tailored programs for faster, real results.
        </p>

        {loading && (
          <div style={{padding:'clamp(30px,6vw,50px)'}}>
            <div style={{width:36,height:36,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 12px'}}/>
            <p style={{color:'var(--muted)'}}>Loading trainer plans…</p>
          </div>
        )}

        {!loading && ptPlans.length > 0 && (
          <div className="plan-grid plan-grid-inner" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:'clamp(14px,2vw,24px)',maxWidth:1100,margin:'0 auto'}}>
            {ptPlans.map(plan => <PlanCard key={plan.id} plan={plan} onSelect={setSelected}/>)}
          </div>
        )}

        {!loading && ptPlans.length === 0 && (
          <div style={{maxWidth:560,margin:'0 auto',background:'linear-gradient(145deg,#130f24,#1a1535)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:22,padding:'clamp(28px,4vw,44px)',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>🏋</div>
            <h3 style={{color:'#bb86fc',fontSize:20,marginBottom:10,fontWeight:700}}>Personal Trainer Plans Coming Soon</h3>
            <p style={{color:'rgba(184,176,212,0.6)',fontSize:14,lineHeight:1.7,marginBottom:22}}>
              We're setting up personalised PT packages. Contact us on WhatsApp to get started with a custom plan today.
            </p>
            <a href="https://wa.me/918484805154?text=Hi!%20I%20am%20interested%20in%20a%20Personal%20Trainer%20plan%20at%20FFC." target="_blank" rel="noreferrer"
              className="btn" style={{fontSize:14,padding:'11px 28px'}}>💬 Enquire on WhatsApp</a>
          </div>
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
