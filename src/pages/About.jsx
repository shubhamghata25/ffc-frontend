import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const DEFAULT_TRAINERS = [
  { id:'1', name:'Nagendra Singh', role:'Head Trainer',  exp:'8+ Years', spec:'Strength & Fat Loss Expert',    status:'Active', photo:'' },
  { id:'2', name:'Depankar Bera',  role:'Fitness Coach', exp:'5+ Years', spec:'Weight Loss & Nutrition Expert', status:'Active', photo:'' },
]

const FEATURES = [
  { icon:'🏋', title:'Modern Equipment',   desc:'International standard machines and free weights for complete body training.' },
  { icon:'🎯', title:'Certified Trainers', desc:'Professional trainers with years of experience in body transformation.' },
  { icon:'🥗', title:'Personal Coaching',  desc:'Customized workout and diet plans tailored to your fitness goals.' },
]

const PROGRAMS = [
  'Weight Loss & Body Transformation',
  'Muscle Gain & Strength Training',
  'Functional Fitness Training',
  'Personal Diet & Nutrition Planning',
  'Beginner to Advanced Programs',
]

export default function About() {
  const [trainers, setTrainers] = useState(DEFAULT_TRAINERS)

  useEffect(() => {
    const api = import.meta.env.VITE_API_URL
    if (!api) return
    fetch(`${api}/api/trainers`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setTrainers(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="page-wrapper">
      <section className="section" style={{ textAlign:'center' }}>

        <div className="fade-up">
          <p style={{ color:'#ff3c00', letterSpacing:4, fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase' }}>EST. JANUARY 2023</p>
          <h1 className="section-title">About Friends Fitness Club</h1>
        </div>

        <div className="fade-up card" style={{ maxWidth:860, margin:'36px auto', padding:'36px 44px', textAlign:'left' }}>
          <p style={{ fontSize:17, lineHeight:2, color:'#ddd', marginBottom:18 }}>
            <strong style={{ color:'#fff' }}>Friends Fitness Club</strong>, founded on <strong style={{ color:'#ff3c00' }}>5th January 2023</strong>,
            is one of the fastest-growing and most result-driven gyms in Nagpur. Started by fitness-driven owners
            who wanted to build a space where members can work out daily without restrictions.
          </p>
          <p style={{ fontSize:15, lineHeight:1.9, color:'#bbb' }}>
            If you are searching for the <strong style={{ color:'#fff' }}>best gym in Nagpur for transformation</strong>,
            Friends Fitness Club offers expert trainers, modern equipment, and a motivating environment.
          </p>
        </div>

        {/* programs */}
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2, color:'#f4b400', marginBottom:24, marginTop:52 }}>Our Training Programs</h2>
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:12 }}>
          {PROGRAMS.map(p => (
            <div key={p} style={{ padding:'10px 22px', borderRadius:40, background:'rgba(255,60,0,0.1)', border:'1px solid rgba(255,60,0,0.3)', color:'#ff3c00', fontWeight:600, fontSize:14 }}>{p}</div>
          ))}
        </div>

        {/* features */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:22, maxWidth:900, margin:'52px auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ padding:30, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>{f.icon}</div>
              <h3 style={{ color:'#ff3c00', marginBottom:10 }}>{f.title}</h3>
              <p style={{ color:'#aaa', fontSize:14, lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* trainers — photos from backend */}
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, letterSpacing:2, color:'#ff3c00', marginBottom:32 }}>Meet Our Trainers</h2>
        <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:26 }}>
          {trainers.filter(t => t.status !== 'Inactive').map(t => (
            <div key={t.id||t.name} className="card" style={{ width:280, padding:'32px 28px', textAlign:'center' }}>
              {/* Photo */}
              {t.photo
                ? <img src={t.photo} alt={t.name} style={{ width:90, height:90, borderRadius:'50%', objectFit:'cover', border:'3px solid #ff3c00', margin:'0 auto 18px', display:'block' }}/>
                : <div style={{ width:90, height:90, borderRadius:'50%', background:'rgba(255,60,0,0.12)', border:'3px solid #ff3c00', margin:'0 auto 18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🏋</div>
              }
              <h4 style={{ color:'#ff3c00', fontSize:18, marginBottom:5 }}>{t.name}</h4>
              <p style={{ color:'#ccc', fontSize:13, marginBottom:3 }}>{t.role} · {t.exp}</p>
              <p style={{ color:'#777', fontSize:13, marginBottom:22 }}>{t.spec}</p>
              <Link to="/contact" className="btn" style={{ fontSize:13, padding:'10px 24px' }}>Book Session</Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop:56 }}>
          <Link to="/pricing" className="btn" style={{ fontSize:16, padding:'14px 40px' }}>Join Now →</Link>
        </div>
      </section>
    </div>
  )
}
