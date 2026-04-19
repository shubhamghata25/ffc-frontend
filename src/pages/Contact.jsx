import React, { useState } from 'react'

const COUNTRY_CODES = [
  { code:'+91', flag:'🇮🇳', label:'India'  },
  { code:'+1',  flag:'🇺🇸', label:'USA'    },
  { code:'+44', flag:'🇬🇧', label:'UK'     },
  { code:'+61', flag:'🇦🇺', label:'Australia'},
  { code:'+971',flag:'🇦🇪', label:'UAE'    },
]

export default function Contact() {
  const [form, setForm]     = useState({ name:'', email:'', phone:'', message:'', countryCode:'+91' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  function set(k, v) { setForm(f => ({ ...f, [k]:v })) }

  async function submit(e) {
    e.preventDefault()
    setStatus('loading')
    const payload = { ...form, phone: form.countryCode + form.phone }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      })
      if (res.ok) { setStatus('success'); setForm({ name:'', email:'', phone:'', message:'', countryCode:'+91' }) }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  return (
    <div className="page-wrapper">
      <section className="section">
        <div style={{ maxWidth:960, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'start' }}>

          {/* LEFT INFO */}
          <div className="fade-up">
            <h1 className="section-title">Get In Touch</h1>
            <p className="section-sub" style={{ marginBottom:40 }}>
              Have questions about membership, training programs, or anything else? We'd love to hear from you.
            </p>

            {[
              { icon:'📍', title:'Address',  lines:['RT Complex, 2nd Floor,','Wardhaman Nagar, Nagpur'] },
              { icon:'📞', title:'Phone',    lines:['+91 84848 05154'] },
              { icon:'✉️', title:'Email',    lines:['friendsfitnessclub18@gmail.com'] },
              { icon:'🕐', title:'Timings',  lines:['Mon–Sat: 5:00 AM – 10:00 PM','Sunday: Closed'] },
            ].map(c => (
              <div key={c.title} style={{ display:'flex', gap:16, marginBottom:28 }}>
                <div style={{ fontSize:24, minWidth:36 }}>{c.icon}</div>
                <div>
                  <h4 style={{ color:'#ff3c00', marginBottom:4, fontSize:14, fontWeight:700 }}>{c.title}</h4>
                  {c.lines.map(l => <p key={l} style={{ color:'#bbb', fontSize:14, lineHeight:1.7 }}>{l}</p>)}
                </div>
              </div>
            ))}

            <div style={{ display:'flex', gap:16, marginTop:20 }}>
              <a href="https://www.instagram.com/friends_fitness.club" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding:'10px 22px', fontSize:13 }}>
                Instagram
              </a>
              <a href={`https://wa.me/918484805154`} target="_blank" rel="noreferrer" className="btn" style={{ padding:'10px 22px', fontSize:13 }}>
                💬 WhatsApp
              </a>
            </div>
          </div>

          {/* RIGHT FORM */}
          <form className="fade-up card" style={{ padding:'40px 36px' }} onSubmit={submit}>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, marginBottom:28, color:'#ff3c00' }}>
              Send Us a Message
            </h2>

            <div style={{ marginBottom:16 }}>
              <input className="form-input" placeholder="Your Name" required value={form.name} onChange={e=>set('name',e.target.value)} />
            </div>
            <div style={{ marginBottom:16 }}>
              <input className="form-input" type="email" placeholder="Your Email" required value={form.email} onChange={e=>set('email',e.target.value)} />
            </div>
            <div style={{ marginBottom:16, display:'flex', gap:10 }}>
              <select className="form-input" value={form.countryCode} onChange={e=>set('countryCode',e.target.value)}
                style={{ width:130, background:'rgba(255,255,255,0.07)' }}>
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <input className="form-input" type="tel" placeholder="10-digit number" maxLength={10} required
                value={form.phone} onChange={e=>set('phone',e.target.value.replace(/\D/,''))} />
            </div>
            <div style={{ marginBottom:24 }}>
              <textarea className="form-input" placeholder="Your Message" required rows={4}
                value={form.message} onChange={e=>set('message',e.target.value)}
                style={{ resize:'none' }} />
            </div>

            {status === 'success' && (
              <div style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'12px 16px', color:'#22c55e', fontSize:14, marginBottom:16 }}>
                ✅ Message sent! We'll get back to you soon.
              </div>
            )}
            {status === 'error' && (
              <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'12px 16px', color:'#ef4444', fontSize:14, marginBottom:16 }}>
                ❌ Something went wrong. Please try WhatsApp instead.
              </div>
            )}

            <button type="submit" className="btn" disabled={status==='loading'} style={{ width:'100%', justifyContent:'center' }}>
              {status==='loading'
                ? <span style={{ width:18,height:18,border:'2px solid #fff4',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}} />
                : 'Send Message →'}
            </button>
          </form>
        </div>
      </section>

      {/* Map embed */}
      <div style={{ width:'100%', height:360, filter:'grayscale(1) invert(0.9)', borderTop:'1px solid #1a1a1a' }}>
        <iframe
          title="gym-location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.1!2d79.08!3d21.13!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDA3JzQ4LjAiTiA3OcKwMDQnNDguMCJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
          width="100%" height="360" style={{ border:0, display:'block' }} allowFullScreen loading="lazy"
        />
      </div>

      <style>{`
        @media(max-width:768px){
          .contact-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  )
}
