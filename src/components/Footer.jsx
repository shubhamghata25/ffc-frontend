import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      background:'rgba(6,5,15,0.98)',
      borderTop:'1px solid rgba(124,58,237,0.15)',
      padding:'60px 8% 28px',
      position:'relative',
      overflow:'hidden',
    }}>
      {/* decorative orb */}
      <div style={{ position:'absolute', bottom:-80, left:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:40, marginBottom:48, position:'relative' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, marginBottom:14,
            background:'linear-gradient(135deg,#bb86fc,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Friends Fitness Club
          </div>
          <p style={{ color:'rgba(184,176,212,0.6)', fontSize:14, lineHeight:1.8 }}>
            Your transformation begins here. Train hard, stay strong, and achieve your fitness goals with us.
          </p>
          <div style={{ display:'flex', gap:12, marginTop:18 }}>
            {[
              { icon:'📷', url:'https://www.instagram.com/friends_fitness.club', label:'Instagram' },
              { icon:'📘', url:'#', label:'Facebook' },
              { icon:'▶',  url:'#', label:'YouTube' },
            ].map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer" title={s.label}
                style={{ width:36, height:36, borderRadius:'50%', background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all .2s', color:'#9c59f7' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(124,58,237,0.3)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(124,58,237,0.15)'; e.currentTarget.style.transform='' }}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ color:'#bb86fc', marginBottom:16, fontSize:13, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>Quick Links</h4>
          {[['Home','/'],['About','/about'],['Pricing','/pricing'],['Store','/store'],['Exercises','/exercises'],['Contact','/contact']].map(([label,path]) => (
            <Link key={path} to={path} style={{ display:'block', color:'rgba(184,176,212,0.6)', fontSize:14, marginBottom:9, transition:'color .2s' }}
              onMouseEnter={e=>e.target.style.color='#bb86fc'} onMouseLeave={e=>e.target.style.color='rgba(184,176,212,0.6)'}>
              {label}
            </Link>
          ))}
        </div>

        <div>
          <h4 style={{ color:'#bb86fc', marginBottom:16, fontSize:13, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>Contact</h4>
          {[
            '📍 RT Complex, 2nd Floor',
            '   Wardhaman Nagar, Nagpur',
            '📞 +91 84848 05154',
            '✉️ friendsfitnessclub18@gmail.com',
            '🕐 Mon–Sat: 5:00 AM – 10:00 PM',
          ].map((t,i) => <p key={i} style={{ color:'rgba(184,176,212,0.6)', fontSize:13, marginBottom:7, lineHeight:1.6 }}>{t}</p>)}
        </div>

        <div>
          <h4 style={{ color:'#bb86fc', marginBottom:16, fontSize:13, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>Programs</h4>
          {['Weight Loss','Muscle Gain','Strength Training','Personal Coaching','Diet Planning'].map(p => (
            <p key={p} style={{ color:'rgba(184,176,212,0.6)', fontSize:13, marginBottom:8 }}>→ {p}</p>
          ))}
        </div>
      </div>

      <div style={{ borderTop:'1px solid rgba(124,58,237,0.1)', paddingTop:22, textAlign:'center', color:'rgba(107,100,144,0.8)', fontSize:13 }}>
        © {new Date().getFullYear()} Friends Fitness Club | All Rights Reserved | Nagpur, Maharashtra
      </div>
    </footer>
  )
}
