import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const LEVELS  = ['All','Beginner','Intermediate','Advanced']
const MUSCLES = ['All','Chest','Legs','Biceps','Back','Shoulders','Cardio']
const LEVEL_COLORS      = { Beginner:'#22c55e', Intermediate:'#f59e0b', Advanced:'#ef4444' }
const PLAN_LEVEL_COLORS = { Beginner:'#22c55e', Intermediate:'#f59e0b', Advanced:'#ef4444', Custom:'#7c3aed' }

function ytId(val) {
  if (!val) return ''
  const m = val.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : val.trim()
}

export default function Exercises() {
  const [exercises,    setExercises]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [level,        setLevel]        = useState('All')
  const [muscle,       setMuscle]       = useState('All')
  const [playing,      setPlaying]      = useState(null)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [plans,        setPlans]        = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [expandedPlan, setExpandedPlan] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/exercises`)
      .then(r => r.json())
      .then(d => { setExercises(d); setLoading(false) })
      .catch(() => setLoading(false))

    fetch(`${API}/api/workout-plans`)
      .then(r => r.json())
      .then(d => { setPlans(Array.isArray(d) ? d : []); setPlansLoading(false) })
      .catch(() => setPlansLoading(false))
  }, [])

  const visible = exercises.filter(e =>
    (level  === 'All' || e.level  === level)  &&
    (muscle === 'All' || e.muscle === muscle) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const FilterPanel = () => (
    <div style={{ padding:'0 20px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, marginBottom:28,
        background:'linear-gradient(135deg,#bb86fc,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
        🏋 Fitness
      </div>
      <p style={{ color:'#6b6490', fontSize:11, letterSpacing:2, marginBottom:10, textTransform:'uppercase' }}>Muscle Group</p>
      {MUSCLES.map(m => (
        <div key={m} onClick={()=>{ setMuscle(m); setDrawerOpen(false) }} style={{
          padding:'9px 12px', marginBottom:4, borderRadius:10, cursor:'pointer',
          background: muscle===m ? 'rgba(124,58,237,0.15)' : 'transparent',
          color: muscle===m ? '#bb86fc' : '#6b6490',
          borderLeft: muscle===m ? '3px solid #7c3aed' : '3px solid transparent',
          fontSize:14, transition:'all .2s',
        }}>{m}</div>
      ))}
      <p style={{ color:'#6b6490', fontSize:11, letterSpacing:2, margin:'20px 0 10px', textTransform:'uppercase' }}>Level</p>
      {LEVELS.map(l => (
        <div key={l} onClick={()=>{ setLevel(l); setDrawerOpen(false) }} style={{
          padding:'9px 12px', marginBottom:4, borderRadius:10, cursor:'pointer',
          background: level===l ? 'rgba(124,58,237,0.15)' : 'transparent',
          color: level===l ? '#bb86fc' : '#6b6490',
          borderLeft: level===l ? '3px solid #7c3aed' : '3px solid transparent',
          fontSize:14, transition:'all .2s',
        }}>{l}</div>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ex-sidebar{width:210px;height:100vh;overflow-y:auto;background:rgba(13,11,26,0.95);border-right:1px solid rgba(124,58,237,0.12);padding:84px 0 30px;position:fixed;top:0;left:0;z-index:10}
        .ex-main{margin-left:210px;padding:84px 28px 60px}
        .ex-card{background:linear-gradient(145deg,#130f24,#1a1535);border-radius:18px;border:1px solid rgba(124,58,237,0.12);overflow:hidden;transition:transform .3s,box-shadow .3s,border-color .3s;animation:fadeUp .4s ease both}
        .ex-card:hover{transform:translateY(-5px);box-shadow:0 14px 40px rgba(124,58,237,0.2);border-color:rgba(124,58,237,0.3)}
        .plan-card{background:linear-gradient(145deg,#130f24,#1a1535);border-radius:18px;border:1px solid rgba(124,58,237,0.12);overflow:hidden;transition:all .3s;animation:fadeUp .4s ease both;cursor:pointer}
        .plan-card:hover{box-shadow:0 10px 32px rgba(124,58,237,0.18);border-color:rgba(124,58,237,0.3)}
        .filter-inp{padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.2);border-radius:10px;color:#f0eeff;font-family:'Poppins',sans-serif;font-size:13px;outline:none;width:clamp(140px,40vw,200px)}
        .filter-inp:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,0.15)}
        @media(max-width:768px){
          .ex-sidebar{display:none}
          .ex-main{margin-left:0;padding:84px 16px 60px}
          .ex-grid{grid-template-columns:1fr!important}
          .plans-grid{grid-template-columns:1fr!important}
          .mob-filter{display:flex!important}
        }
        .mob-filter{display:none;gap:8px;flex-wrap:wrap;margin-bottom:18px}
        .mob-chip{padding:6px 14px;border-radius:20px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;background:rgba(124,58,237,0.15);color:#bb86fc;transition:all .2s}
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:199;display:flex;align-items:flex-end}
        .drawer-content{background:#0d0b1a;border-radius:20px 20px 0 0;padding:24px 0 40px;width:100%;max-height:70vh;overflow-y:auto;border-top:1px solid rgba(124,58,237,0.2)}
        .mob-filter-btn{display:none;padding:9px 16px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#bb86fc;border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;font-family:'Poppins',sans-serif}
        @media(max-width:768px){.mob-filter-btn{display:block}}
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="ex-sidebar"><FilterPanel /></aside>

      <main className="ex-main">
        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2, background:'linear-gradient(135deg,#bb86fc,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Workout Library
          </h1>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input className="filter-inp" placeholder="🔍  Search exercise…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <button className="mob-filter-btn" onClick={()=>setDrawerOpen(true)}>⚙ Filter</button>
          </div>
        </div>

        {/* Mobile active filters */}
        <div className="mob-filter">
          {level!=='All'  && <span className="mob-chip" onClick={()=>setLevel('All')}>Level: {level} ✕</span>}
          {muscle!=='All' && <span className="mob-chip" onClick={()=>setMuscle('All')}>Muscle: {muscle} ✕</span>}
        </div>

        {/* ── EXERCISES GRID ── */}
        {loading && (
          <div style={{ textAlign:'center', padding:80 }}>
            <div style={{ width:40,height:40,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px' }}/>
            <p style={{ color:'#6b6490' }}>Loading exercises…</p>
          </div>
        )}

        {!loading && (
          <div className="ex-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:22 }}>
            {visible.map((ex, idx) => {
              const vid = ex.ytId || ytId(ex.ytLink)
              const thumb = ex.image || (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : '')
              const lc = LEVEL_COLORS[ex.level] || '#888'
              return (
                <div key={ex.id||ex.name} className="ex-card" style={{ animationDelay:`${idx*0.04}s` }}>
                  <div style={{ padding:'18px 18px 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <h3 style={{ color:'var(--text)', fontSize:16, fontWeight:700, marginBottom:3 }}>{ex.name}</h3>
                        <p style={{ color:'#6b6490', fontSize:12 }}>{ex.muscle}</p>
                      </div>
                      {ex.level && (
                        <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:`${lc}22`, color:lc, whiteSpace:'nowrap' }}>{ex.level}</span>
                      )}
                    </div>
                    {ex.description && <p style={{ color:'#6b6490', fontSize:12, lineHeight:1.6, marginBottom:10 }}>{ex.description}</p>}
                  </div>

                  <div style={{ padding:'0 0 14px' }}>
                    {playing===(ex.id||ex.name) && vid ? (
                      <iframe src={`https://www.youtube.com/embed/${vid}?autoplay=1`}
                        style={{ width:'100%', height:'clamp(160px,35vw,195px)', border:'none', display:'block' }}
                        allow="autoplay; encrypted-media" allowFullScreen title={ex.name}/>
                    ) : (
                      <div onClick={()=>vid&&setPlaying(ex.id||ex.name)} style={{
                        margin:'0 14px', height:165, borderRadius:12, overflow:'hidden',
                        background: thumb ? `url(${thumb}) center/cover` : 'rgba(124,58,237,0.06)',
                        cursor: vid ? 'pointer' : 'default',
                        display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
                      }}>
                        {thumb && <div style={{ position:'absolute', inset:0, background:'rgba(6,5,15,0.4)' }}/>}
                        {vid && (
                          <div style={{ width:48,height:48,borderRadius:'50%',background:'rgba(124,58,237,0.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,zIndex:1,boxShadow:'0 0 24px rgba(124,58,237,0.6)' }}>▶</div>
                        )}
                        {!vid && !thumb && <p style={{ color:'#2a2347', fontSize:13 }}>No video</p>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {visible.length===0 && !loading && (
              <p style={{ color:'#6b6490', gridColumn:'1/-1', textAlign:'center', padding:60 }}>No exercises found.</p>
            )}
          </div>
        )}

        {/* ── WORKOUT PLANS SECTION ── */}
        <div style={{ marginTop:64 }}>
          {/* Section header */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8 }}>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2,
              background:'linear-gradient(135deg,#bb86fc,#7c3aed)', WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Workout Plans
            </h2>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(124,58,237,0.3),transparent)' }}/>
          </div>
          <p style={{ color:'#6b6490', fontSize:13, marginBottom:28 }}>
            Curated plans for every fitness level — pick yours and get started.
          </p>

          {plansLoading && (
            <div style={{ textAlign:'center', padding:60 }}>
              <div style={{ width:36,height:36,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 12px' }}/>
              <p style={{ color:'#6b6490' }}>Loading plans…</p>
            </div>
          )}

          {!plansLoading && plans.length===0 && (
            <div style={{ textAlign:'center', padding:60, color:'#6b6490' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <p>No workout plans available yet.</p>
            </div>
          )}

          {!plansLoading && plans.length>0 && (
            <div className="plans-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:22 }}>
              {plans.map((plan, idx) => {
                const lc       = PLAN_LEVEL_COLORS[plan.level] || '#7c3aed'
                const exCount  = Array.isArray(plan.exercises) ? plan.exercises.length : 0
                const isOpen   = expandedPlan === (plan._uid || plan.id)

                return (
                  <div key={plan._uid||plan.id} className="plan-card" style={{ animationDelay:`${idx*0.05}s` }}
                    onClick={()=>setExpandedPlan(isOpen ? null : (plan._uid||plan.id))}>

                    {/* Card header */}
                    <div style={{ padding:'20px 20px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                        <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:`${lc}22`, color:lc, border:`1px solid ${lc}44` }}>
                          {plan.level}
                        </span>
                        <span style={{ fontSize:12, color:'#6b6490' }}>{exCount} exercise{exCount!==1?'s':''}</span>
                      </div>

                      <h3 style={{ color:'#f0eeff', fontWeight:700, fontSize:17, marginBottom:6 }}>{plan.name}</h3>

                      {plan.description && (
                        <p style={{ color:'#6b6490', fontSize:13, lineHeight:1.6, marginBottom:12,
                          overflow: isOpen ? 'visible' : 'hidden',
                          display: isOpen ? 'block' : '-webkit-box',
                          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                        }}>{plan.description}</p>
                      )}

                      {/* Exercise preview pills */}
                      {exCount>0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                          {plan.exercises.slice(0, isOpen ? plan.exercises.length : 4).map((ex,i) => (
                            <span key={ex.id||i} style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                              background:'rgba(124,58,237,0.12)', color:'#bb86fc', border:'1px solid rgba(124,58,237,0.2)' }}>
                              {ex.name}
                            </span>
                          ))}
                          {!isOpen && exCount>4 && (
                            <span style={{ padding:'3px 10px', fontSize:11, color:'#6b6490' }}>+{exCount-4} more</span>
                          )}
                        </div>
                      )}

                      {/* Toggle hint */}
                      <div style={{ fontSize:12, color:'#7c3aed', fontWeight:600 }}>
                        {isOpen ? '▲ Hide details' : '▼ View full plan'}
                      </div>
                    </div>

                    {/* Expanded exercise list */}
                    {isOpen && exCount>0 && (
                      <div style={{ borderTop:'1px solid rgba(124,58,237,0.15)', padding:'16px 20px 20px' }}
                        onClick={e=>e.stopPropagation()}>
                        {plan.exercises.map((ex, i) => {
                          const thumb = ex.image || (ytId(ex.ytLink) ? `https://img.youtube.com/vi/${ytId(ex.ytLink)}/hqdefault.jpg` : '')
                          const elc   = PLAN_LEVEL_COLORS[ex.level] || '#888'
                          return (
                            <div key={ex.id||i} style={{ display:'flex', gap:12, alignItems:'flex-start',
                              padding:'12px 14px', borderRadius:12, marginBottom:8,
                              background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.12)' }}>

                              {/* Number */}
                              <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
                                background:'rgba(124,58,237,0.2)', color:'#bb86fc', fontWeight:700,
                                fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</div>

                              {/* Thumbnail */}
                              {thumb && (
                                <div style={{ width:48, height:48, borderRadius:8, overflow:'hidden', flexShrink:0 }}>
                                  <img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                </div>
                              )}

                              {/* Info */}
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontWeight:700, fontSize:13, color:'#f0eeff', marginBottom:4 }}>{ex.name}</div>
                                <div style={{ fontSize:11, color:'#6b6490', marginBottom:6 }}>
                                  {ex.muscle && <span>💪 {ex.muscle}</span>}
                                  {ex.level  && <span style={{ marginLeft:8, color:elc }}>{ex.level}</span>}
                                </div>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  {ex.sets && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(34,197,94,0.12)',  color:'#22c55e' }}>Sets: {ex.sets}</span>}
                                  {ex.reps && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>Reps: {ex.reps}</span>}
                                  {ex.rest && <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(124,58,237,0.12)', color:'#bb86fc' }}>Rest: {ex.rest}</span>}
                                </div>
                                {ex.note && <div style={{ marginTop:5, fontSize:11, color:'#6b6490', fontStyle:'italic' }}>📝 {ex.note}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={()=>setDrawerOpen(false)}>
          <div className="drawer-content" onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 20px 16px', borderBottom:'1px solid rgba(124,58,237,0.12)' }}>
              <span style={{ fontWeight:700, fontSize:16, color:'#bb86fc' }}>Filter Exercises</span>
              <button onClick={()=>setDrawerOpen(false)} style={{ background:'none',border:'none',color:'#6b6490',fontSize:22,cursor:'pointer' }}>✕</button>
            </div>
            <FilterPanel/>
          </div>
        </div>
      )}
    </div>
  )
}
