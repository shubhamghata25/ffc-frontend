import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      background: 'rgba(0,0,0,0.97)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '70px 8% 30px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 40,
        marginBottom: 50,
      }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:3, color:'#ff3c00', marginBottom:14 }}>
            Friends Fitness Club
          </div>
          <p style={{ color:'#888', fontSize:14, lineHeight:1.8 }}>
            Your transformation begins here. Train hard, stay strong, and achieve your fitness goals with us.
          </p>
        </div>

        <div>
          <h4 style={{ color:'#ff3c00', marginBottom:16, fontSize:15 }}>Quick Links</h4>
          {['/', '/about', '/pricing', '/store', '/exercises', '/contact'].map((path, i) => (
            <Link key={path} to={path} style={{ display:'block', color:'#888', fontSize:14, marginBottom:8, transition:'color .2s' }}
              onMouseEnter={e=>e.target.style.color='#fff'}
              onMouseLeave={e=>e.target.style.color='#888'}>
              {['Home','About','Pricing','Store','Exercises','Contact'][i]}
            </Link>
          ))}
        </div>

        <div>
          <h4 style={{ color:'#ff3c00', marginBottom:16, fontSize:15 }}>Contact Info</h4>
          {[
            '📍 RT Complex, 2nd Floor,',
            '   Wardhaman Nagar, Nagpur',
            '📞 +91 84848 05154',
            '✉️ friendsfitnessclub18@gmail.com',
            '🕐 Mon–Sat: 5:00 AM – 10:00 PM',
          ].map((t,i) => (
            <p key={i} style={{ color:'#888', fontSize:13, marginBottom:6, lineHeight:1.6 }}>{t}</p>
          ))}
        </div>

        <div>
          <h4 style={{ color:'#ff3c00', marginBottom:16, fontSize:15 }}>Follow Us</h4>
          {[
            { label:'Instagram', url:'https://www.instagram.com/friends_fitness.club' },
            { label:'Facebook',  url:'#' },
            { label:'YouTube',   url:'#' },
          ].map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer"
              style={{ display:'block', color:'#888', fontSize:14, marginBottom:8, transition:'color .2s' }}
              onMouseEnter={e=>e.target.style.color='#ff3c00'}
              onMouseLeave={e=>e.target.style.color='#888'}>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:24, textAlign:'center', color:'#555', fontSize:13 }}>
        © {new Date().getFullYear()} Friends Fitness Club | All Rights Reserved | Nagpur, Maharashtra
      </div>
    </footer>
  )
}
