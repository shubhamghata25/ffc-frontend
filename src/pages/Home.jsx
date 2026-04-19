import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function useCounter(target, duration = 1800, trigger) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(start)
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [trigger, target, duration])
  return val
}

function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

const TESTIMONIALS = [
  { text: 'Best gym in Nagpur! My transformation in 3 months was unbelievable.', name: 'Rahul S.' },
  { text: 'Trainer Nagendra is world-class. Lost 12 kg in 4 months!', name: 'Priya Y.' },
  { text: 'Affordable pricing with premium equipment. Totally worth it.', name: 'Amit K.' },
]

export default function Home() {
  const [countersRef, countersVisible] = useInView()
  const members  = useCounter(200, 1600, countersVisible)
  const trainers = useCounter(5,   1000, countersVisible)
  const years    = useCounter(3,   1000, countersVisible)

  const [tIdx, setTIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 3200)
    return () => clearInterval(t)
  }, [])

  const [offer, setOffer] = useState(null)
  useEffect(() => {
    const api = import.meta.env.VITE_API_URL
    if (!api) return
    fetch(`${api}/api/offer`)
      .then(r => r.json())
      .then(d => { if (d && d.status === 'ON') setOffer(d) })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* ── HERO ── */}
      <section style={{ position:'relative', height:'100vh', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <video autoPlay muted loop playsInline style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:1 }}>
          <source src="/gym-video.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.62)', zIndex:2 }} />

        {/* Hero content — centred, no absolute positioning so it truly centres */}
        <div className="fade-up" style={{ position:'relative', zIndex:3, textAlign:'center', padding:'0 24px', width:'100%', maxWidth:780 }}>

          {/* Tag line */}
          <p style={{ color:'#ff3c00', letterSpacing:3, fontSize:12, fontWeight:700, marginBottom:18, textTransform:'uppercase' }}>
            🏋 Nagpur's #1 Fitness Club — Est. 2023
          </p>

          {/* Main heading — clamp keeps it readable on every screen */}
          <h1 style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:'clamp(42px, 10vw, 96px)',
            letterSpacing:4,
            lineHeight:1.05,
            marginBottom:22,
            animation:'glow 3s ease-in-out infinite',
          }}>
            Push Harder<br />Than Yesterday
          </h1>

          {/* Sub-text — proper line-height, responsive size */}
          <p style={{
            color:'#cccccc',
            fontSize:'clamp(14px, 2.2vw, 17px)',
            lineHeight:1.75,
            maxWidth:520,
            margin:'0 auto 36px',
          }}>
            Transform your body with expert trainers, modern equipment &amp; personalised diet plans — all under one roof in Nagpur.
          </p>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/pricing" className="btn">Join Now →</Link>
            <Link to="/about"   className="btn btn-ghost">Learn More</Link>
          </div>
        </div>

        {/* scroll hint */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:3, textAlign:'center' }}>
          <div style={{ width:2, height:44, background:'linear-gradient(#ff3c00,transparent)', margin:'0 auto' }} />
          <p style={{ color:'#555', fontSize:10, marginTop:7, letterSpacing:3 }}>SCROLL</p>
        </div>
      </section>

      {/* ── COUNTERS ── */}
      <section ref={countersRef} style={{ background:'#0f0f0f', padding:'80px 8%', borderBottom:'1px solid #1a1a1a' }}>
        <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:60 }}>
          {[
            { val:members,  label:'Active Members',      suffix:'+' },
            { val:trainers, label:'Expert Trainers',     suffix:''  },
            { val:years,    label:'Years of Excellence', suffix:'+' },
          ].map(c => (
            <div key={c.label} style={{ textAlign:'center', minWidth:140 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, color:'#ff3c00', lineHeight:1 }}>
                {c.val}{c.suffix}
              </div>
              <p style={{ color:'#777', fontSize:13, letterSpacing:1, marginTop:8, textTransform:'uppercase' }}>{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OFFER BANNER ── */}
      {offer && (
        <section style={{ borderBottom:'1px solid rgba(255,60,0,0.3)', position:'relative', overflow:'hidden' }}>
          {/* Poster image as full-width background */}
          {offer.poster && (
            <div style={{ position:'relative' }}>
              <img src={offer.poster} alt={offer.title}
                style={{ width:'100%', maxHeight:420, objectFit:'cover', display:'block' }}/>
              {/* Dark overlay on poster */}
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.52)' }}/>
              {/* Text on top of poster */}
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 8%', textAlign:'center' }}>
                <div style={{ display:'inline-block', background:'#ff3c00', color:'#fff', borderRadius:30, padding:'4px 20px', fontSize:12, fontWeight:700, letterSpacing:2, marginBottom:14 }}>
                  LIMITED TIME OFFER
                </div>
                <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(30px,6vw,64px)', letterSpacing:3, marginBottom:12 }}>{offer.title}</h2>
                <p style={{ color:'#ddd', marginBottom:28, fontSize:'clamp(14px,2vw,17px)', lineHeight:1.7, maxWidth:560 }}>{offer.description}</p>
                <a href={offer.link} className="btn" style={{ fontSize:16, padding:'14px 40px' }}>{offer.btn}</a>
              </div>
            </div>
          )}
          {/* No poster — plain colour banner */}
          {!offer.poster && (
            <div style={{ background:'linear-gradient(135deg,#1a0500,#2a0a00)', padding:'52px 8%', textAlign:'center' }}>
              <div style={{ display:'inline-block', background:'#ff3c00', color:'#fff', borderRadius:30, padding:'4px 20px', fontSize:12, fontWeight:700, letterSpacing:2, marginBottom:14 }}>
                LIMITED TIME OFFER
              </div>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,5vw,56px)', letterSpacing:2, marginBottom:12 }}>{offer.title}</h2>
              <p style={{ color:'#ccc', marginBottom:26, fontSize:16, lineHeight:1.7 }}>{offer.description}</p>
              <a href={offer.link} className="btn">{offer.btn}</a>
            </div>
          )}
        </section>
      )}

      {/* ── WHY CHOOSE US ── */}
      <section className="section" style={{ background:'#000', textAlign:'center' }}>
        <h2 className="section-title" style={{ textAlign:'center' }}>Why Choose Us</h2>
        <p className="section-sub" style={{ margin:'0 auto 52px', textAlign:'center' }}>
          We combine cutting-edge equipment with personalised coaching to deliver real, visible results.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:22, maxWidth:1100, margin:'0 auto' }}>
          {[
            { icon:'🏋', title:'Modern Equipment',   desc:'International standard machines and free weights for complete body training.' },
            { icon:'🎯', title:'Certified Trainers', desc:'Professional trainers with years of experience in body transformation.' },
            { icon:'🥗', title:'Diet Planning',      desc:'Customised nutrition plans tailored specifically to your fitness goals.' },
            { icon:'📈', title:'Proven Results',     desc:'200+ members transformed with our scientifically-backed programs.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ padding:'34px 26px', textAlign:'center' }}>
              <div style={{ fontSize:38, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ color:'#ff3c00', marginBottom:10, fontSize:17 }}>{f.title}</h3>
              <p style={{ color:'#aaa', fontSize:14, lineHeight:1.75 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ background:'#0f0f0f', padding:'80px 8%', textAlign:'center', borderTop:'1px solid #1a1a1a' }}>
        <h2 className="section-title" style={{ textAlign:'center' }}>Member Stories</h2>
        <div style={{ maxWidth:620, margin:'36px auto 0', background:'rgba(255,60,0,0.06)', border:'1px solid rgba(255,60,0,0.2)', borderRadius:20, padding:'36px 32px' }}>
          <p style={{ fontSize:'clamp(15px,2vw,18px)', lineHeight:1.85, color:'#ddd', marginBottom:18 }}>
            "{TESTIMONIALS[tIdx].text}"
          </p>
          <p style={{ color:'#ff3c00', fontWeight:700 }}>— {TESTIMONIALS[tIdx].name}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:22 }}>
            {TESTIMONIALS.map((_,i) => (
              <div key={i} onClick={() => setTIdx(i)} style={{ width:i===tIdx?24:8, height:8, borderRadius:4, background:i===tIdx?'#ff3c00':'#333', cursor:'pointer', transition:'all .3s' }}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOP PREVIEW ── */}
      <section className="section" style={{ background:'#000', textAlign:'center' }}>
        <h2 className="section-title" style={{ textAlign:'center' }}>Shop Our Products</h2>
        <p className="section-sub" style={{ margin:'0 auto 36px', textAlign:'center' }}>
          Premium supplements, equipment &amp; accessories at the best prices.
        </p>
        <div style={{ maxWidth:480, margin:'0 auto', borderRadius:20, overflow:'hidden', border:'1px solid rgba(255,60,0,0.2)' }}>
          <img src="https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800" alt="Gym Supplements"
            style={{ width:'100%', height:260, objectFit:'cover', display:'block' }} />
          <div style={{ padding:26, background:'rgba(0,0,0,0.85)' }}>
            <Link to="/store" className="btn">Shop Now →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'90px 8%', textAlign:'center', background:'linear-gradient(135deg,#100200,#200500)', borderTop:'1px solid rgba(255,60,0,0.2)' }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,7vw,70px)', letterSpacing:3, marginBottom:14 }}>
          Ready to Transform?
        </h2>
        <p style={{ color:'#aaa', fontSize:'clamp(14px,1.8vw,16px)', marginBottom:34, lineHeight:1.7, maxWidth:500, margin:'0 auto 34px' }}>
          Join 200+ members who already changed their lives at Friends Fitness Club, Nagpur.
        </p>
        <Link to="/pricing" className="btn" style={{ fontSize:16, padding:'14px 42px' }}>View Membership Plans</Link>
      </section>
    </>
  )
}
