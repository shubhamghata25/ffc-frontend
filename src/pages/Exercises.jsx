import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LEVELS  = ['All','Beginner','Intermediate','Advanced']
const MUSCLES = ['All','Chest','Legs','Biceps','Back','Shoulders','Cardio']
const LEVEL_COLORS = { Beginner:'#22c55e', Intermediate:'#f59e0b', Advanced:'#ef4444' }

/* extract YouTube ID from any YT url or bare ID */
function ytId(val) {
  if (!val) return ''
  const m = val.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : val
}

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search,  setSearch]      = useState('')
  const [level,   setLevel]       = useState('All')
  const [muscle,  setMuscle]      = useState('All')
  const [playing, setPlaying]     = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/exercises`)
      .then(r => r.json())
      .then(d => { setExercises(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const visible = exercises.filter(e =>
    (level  === 'All' || e.level  === level)  &&
    (muscle === 'All' || e.muscle === muscle) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const SIDEBAR = (
    <div style={{ padding:'0 20px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, color:'#ff3c00', marginBottom:28 }}>
        🏋 Fitness
      </div>

      <p style={{ color:'#444', fontSize:11, letterSpacing:2, marginBottom:10, textTransform:'uppercase' }}>Muscle Group</p>
      {MUSCLES.map(m => (
        <div key={m} onClick={() => { setMuscle(m); setSidebarOpen(false) }} style={{
          padding:'9px 12px', marginBottom:4, borderRadius:8, cursor:'pointer',
          background: muscle===m ? 'rgba(255,60,0,0.15)' : 'transparent',
          color: muscle===m ? '#ff3c00' : '#666',
          borderLeft: muscle===m ? '3px solid #ff3c00' : '3px solid transparent',
          fontSize:14, transition:'all .2s',
        }}>{m}</div>
      ))}

      <p style={{ color:'#444', fontSize:11, letterSpacing:2, margin:'20px 0 10px', textTransform:'uppercase' }}>Level</p>
      {LEVELS.map(l => (
        <div key={l} onClick={() => { setLevel(l); setSidebarOpen(false) }} style={{
          padding:'9px 12px', marginBottom:4, borderRadius:8, cursor:'pointer',
          background: level===l ? 'rgba(255,60,0,0.15)' : 'transparent',
          color: level===l ? '#ff3c00' : '#666',
          borderLeft: level===l ? '3px solid #ff3c00' : '3px solid transparent',
          fontSize:14, transition:'all .2s',
        }}>{l}</div>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ex-card{background:rgba(255,255,255,0.04);border-radius:18px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;transition:transform .3s,box-shadow .3s;animation:fadeUp .4s ease both}
        .ex-card:hover{transform:translateY(-5px);box-shadow:0 0 26px rgba(255,60,0,0.18)}

        /* desktop sidebar */
        .ex-sidebar{
          width:210px;min-height:100vh;background:#050505;
          border-right:1px solid #111;padding:84px 0 30px;
          position:fixed;top:0;left:0;z-index:10;
        }
        .ex-main{margin-left:210px;padding:84px 28px 60px;}

        /* mobile */
        @media(max-width:768px){
          .ex-sidebar{display:none}
          .ex-main{margin-left:0;padding:84px 16px 60px}
          .ex-grid{grid-template-columns:1fr!important}
          .mobile-filter-bar{display:flex!important}
        }
        .mobile-filter-bar{display:none;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .mobile-filter-btn{padding:6px 14px;border-radius:20px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .2s}

        /* mobile drawer */
        .mobile-drawer{
          position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.8);
          display:flex;align-items:flex-end;
        }
        .mobile-drawer-content{
          background:#0d0d0d;border-radius:20px 20px 0 0;
          padding:24px 0 40px;width:100%;max-height:70vh;overflow-y:auto;
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="ex-sidebar">{SIDEBAR}</aside>

      {/* Main */}
      <main className="ex-main">
        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2, color:'#ff3c00' }}>
            Workout Library
          </h1>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input
              placeholder="🔍  Search exercise…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding:'9px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid #222', borderRadius:10, color:'#fff', fontFamily:'Poppins,sans-serif', fontSize:13, outline:'none', width:200 }}
            />
            {/* Mobile filter trigger */}
            <button onClick={() => setSidebarOpen(true)}
              style={{ display:'none', padding:'9px 16px', background:'rgba(255,60,0,0.15)', border:'1px solid rgba(255,60,0,0.3)', color:'#ff3c00', borderRadius:10, fontWeight:600, fontSize:13, cursor:'pointer' }}
              className="mobile-filter-trigger">
              ⚙ Filter
            </button>
          </div>
        </div>

        {/* Mobile active filters */}
        <div className="mobile-filter-bar">
          {(level !== 'All' || muscle !== 'All') && (
            <>
              {level !== 'All'  && <span className="mobile-filter-btn" style={{ background:'rgba(255,60,0,0.15)',color:'#ff3c00' }} onClick={() => setLevel('All')}>Level: {level} ✕</span>}
              {muscle !== 'All' && <span className="mobile-filter-btn" style={{ background:'rgba(255,60,0,0.15)',color:'#ff3c00' }} onClick={() => setMuscle('All')}>Muscle: {muscle} ✕</span>}
            </>
          )}
        </div>

        {loading && (
          <div style={{ textAlign:'center', padding:80 }}>
            <div style={{ width:40,height:40,border:'3px solid #222',borderTopColor:'#ff3c00',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px' }}/>
            <p style={{ color:'#555' }}>Loading exercises…</p>
          </div>
        )}

        {!loading && (
          <div className="ex-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:22 }}>
            {visible.map((ex, idx) => {
              const vid = ex.ytId || ytId(ex.ytLink)
              const thumb = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : (ex.image || '')
              return (
                <div key={ex.id||ex.name} className="ex-card" style={{ animationDelay:`${idx*0.04}s` }}>
                  <div style={{ padding:'18px 18px 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <h3 style={{ color:'#fff', fontSize:16, fontWeight:700, marginBottom:4 }}>{ex.name}</h3>
                        <p style={{ color:'#555', fontSize:12 }}>{ex.muscle}</p>
                      </div>
                      {ex.level && (
                        <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:`${LEVEL_COLORS[ex.level] || '#888'}22`, color:LEVEL_COLORS[ex.level] || '#888', whiteSpace:'nowrap' }}>
                          {ex.level}
                        </span>
                      )}
                    </div>
                    {ex.description && <p style={{ color:'#555', fontSize:12, lineHeight:1.6, marginBottom:10 }}>{ex.description}</p>}
                  </div>

                  {/* Video / thumbnail */}
                  <div style={{ padding:'0 0 14px' }}>
                    {playing === (ex.id||ex.name) && vid ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${vid}?autoplay=1`}
                        style={{ width:'100%', height:195, border:'none', display:'block' }}
                        allow="autoplay; encrypted-media" allowFullScreen title={ex.name}
                      />
                    ) : (
                      <div
                        onClick={() => vid && setPlaying(ex.id||ex.name)}
                        style={{
                          margin:'0 14px', height:165, borderRadius:12, overflow:'hidden',
                          background: thumb ? `url(${thumb}) center/cover` : 'rgba(255,255,255,0.04)',
                          cursor: vid ? 'pointer' : 'default',
                          display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
                        }}
                      >
                        {thumb && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)' }}/>}
                        {vid && (
                          <div style={{ width:46,height:46,borderRadius:'50%',background:'rgba(255,60,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,zIndex:1,boxShadow:'0 0 18px rgba(255,60,0,0.6)' }}>▶</div>
                        )}
                        {!vid && !thumb && <p style={{ color:'#444', fontSize:13 }}>No video</p>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {!loading && visible.length === 0 && (
              <p style={{ color:'#444', gridColumn:'1/-1', textAlign:'center', padding:60, fontSize:15 }}>No exercises found.</p>
            )}
          </div>
        )}
      </main>

      {/* Mobile filter drawer */}
      {sidebarOpen && (
        <div className="mobile-drawer" onClick={() => setSidebarOpen(false)}>
          <div className="mobile-drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 20px 16px', borderBottom:'1px solid #1a1a1a' }}>
              <span style={{ fontWeight:700, fontSize:16 }}>Filter Exercises</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background:'none',border:'none',color:'#666',fontSize:22,cursor:'pointer' }}>✕</button>
            </div>
            {SIDEBAR}
          </div>
        </div>
      )}

      <style>{`.mobile-filter-trigger{display:none} @media(max-width:768px){.mobile-filter-trigger{display:block!important}}`}</style>
    </div>
  )
}
