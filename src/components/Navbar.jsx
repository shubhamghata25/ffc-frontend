import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/',          label: 'Home'      },
  { to: '/about',     label: 'About'     },
  { to: '/pricing',   label: 'Pricing'   },
  { to: '/store',     label: 'Store'     },
  { to: '/exercises', label: 'Exercises' },
  { to: '/contact',   label: 'Contact'   },
]

const s = {
  header: {
    position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 8%',
    background: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    transition: 'padding .3s',
  },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 26,
    letterSpacing: 3,
    color: '#ff3c00',
    animation: 'glow 3s ease-in-out infinite',
  },
  nav: { display: 'flex', gap: 28, alignItems: 'center' },
  link: (active) => ({
    color: active ? '#ff3c00' : '#ccc',
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: 0.5,
    transition: 'color .2s',
    position: 'relative',
    paddingBottom: 4,
    borderBottom: active ? '2px solid #ff3c00' : '2px solid transparent',
  }),
  hamburger: {
    display: 'none', flexDirection: 'column', gap: 5,
    cursor: 'pointer', background: 'none', border: 'none', padding: 4,
  },
  bar: (open, i) => {
    const base = { width: 26, height: 3, background: '#ff3c00', borderRadius: 2, transition: 'all .3s' }
    if (!open) return base
    if (i === 0) return { ...base, transform: 'rotate(45deg) translate(5px, 6px)' }
    if (i === 1) return { ...base, opacity: 0 }
    if (i === 2) return { ...base, transform: 'rotate(-45deg) translate(5px, -6px)' }
  },
  drawer: (open) => ({
    position: 'fixed', top: 0, right: open ? 0 : '-280px',
    width: 260, height: '100vh',
    background: '#000',
    boxShadow: '-4px 0 30px rgba(0,0,0,.8)',
    display: 'flex', flexDirection: 'column',
    paddingTop: 100, gap: 4,
    transition: 'right .4s cubic-bezier(.4,0,.2,1)',
    zIndex: 999,
  }),
  drawerLink: (active) => ({
    padding: '14px 32px',
    color: active ? '#ff3c00' : '#ccc',
    fontWeight: 500,
    fontSize: 17,
    borderLeft: active ? '3px solid #ff3c00' : '3px solid transparent',
    transition: 'all .2s',
  }),
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      <style>{`
        @media(max-width:768px){
          .ffc-nav-links { display: none !important; }
          .ffc-hamburger { display: flex !important; }
        }
      `}</style>

      <header style={{ ...s.header, padding: scrolled ? '12px 8%' : '18px 8%' }}>
        <NavLink to="/" style={s.logo}>Friends Fitness Club</NavLink>

        <nav className="ffc-nav-links" style={s.nav}>
          {LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to==='/'} style={({ isActive }) => s.link(isActive)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button className="ffc-hamburger" style={s.hamburger} onClick={() => setOpen(o => !o)} aria-label="Menu">
          {[0,1,2].map(i => <span key={i} style={s.bar(open, i)} />)}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:998
        }}/>
      )}

      <nav style={s.drawer(open)}>
        {LINKS.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to==='/'} style={({ isActive }) => s.drawerLink(isActive)}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
