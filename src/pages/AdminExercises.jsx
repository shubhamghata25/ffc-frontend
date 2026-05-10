import { useState, useEffect, useCallback } from 'react'

/* ── helpers ── */
function ytId(val) {
  if (!val) return ''
  const m = val.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : val.trim()
}
function ytThumb(link) {
  const id = ytId(link)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

const LEVELS       = ['Beginner','Intermediate','Advanced']
const PLAN_LEVELS  = ['Beginner','Intermediate','Advanced','Custom']
const MUSCLES      = ['Chest','Legs','Biceps','Back','Shoulders','Cardio','Full Body','Arms','Core']
const MUSCLES_FILTER = ['All','Chest','Legs','Biceps','Back','Shoulders','Cardio','Full Body','Arms','Core']
const LEVEL_COLORS = { Beginner:'#22c55e', Intermediate:'#f59e0b', Advanced:'#ef4444', Custom:'#7c3aed' }

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'9px 22px', border:'none', borderRadius:8, cursor:'pointer',
      fontFamily:"'Poppins',sans-serif", fontWeight:600, fontSize:13, transition:'all .18s',
      background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
      color: active ? '#bb86fc' : '#6b6490',
      borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    }}>{label}</button>
  )
}

function ExPickerCard({ ex, selected, onToggle }) {
  const thumb = ex.image || ytThumb(ex.ytLink)
  const lc = LEVEL_COLORS[ex.level] || '#888'
  return (
    <div onClick={() => onToggle(ex)} style={{
      display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
      borderRadius:12, cursor:'pointer', transition:'all .15s',
      border: selected ? '1.5px solid #7c3aed' : '1.5px solid #2a2347',
      background: selected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'#111' }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
          : <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🏋</div>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'#f0eeff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ex.name}</div>
        <div style={{ fontSize:11, color:'#6b6490', marginTop:2 }}>
          {ex.muscle && <span>💪 {ex.muscle}</span>}
          {ex.level  && <span style={{ marginLeft:8, color:lc }}>{ex.level}</span>}
        </div>
      </div>
      <div style={{
        width:22, height:22, borderRadius:'50%', flexShrink:0, transition:'all .15s',
        background: selected ? '#7c3aed' : 'transparent',
        border: selected ? '2px solid #7c3aed' : '2px solid #3d3566',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontSize:13,
      }}>{selected ? '✓' : ''}</div>
    </div>
  )
}

function ExDetailRow({ item, onChange, onRemove }) {
  const s = { width:'100%', padding:'7px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid #2a2347', borderRadius:8, color:'#f0eeff', fontSize:13, outline:'none', fontFamily:"'Poppins',sans-serif" }
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px',
      borderRadius:12, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:10 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'#bb86fc', marginBottom:8 }}>{item.name}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:'#6b6490', marginBottom:4, textTransform:'uppercase', letterSpacing:.06 }}>Sets</div>
            <input type="number" min="1" max="20" value={item.sets||''} onChange={e=>onChange({...item,sets:e.target.value})} placeholder="e.g. 3" style={s}/>
          </div>
          <div>
            <div style={{ fontSize:10, color:'#6b6490', marginBottom:4, textTransform:'uppercase', letterSpacing:.06 }}>Reps / Duration</div>
            <input value={item.reps||''} onChange={e=>onChange({...item,reps:e.target.value})} placeholder="e.g. 12 or 30s" style={s}/>
          </div>
          <div>
            <div style={{ fontSize:10, color:'#6b6490', marginBottom:4, textTransform:'uppercase', letterSpacing:.06 }}>Rest</div>
            <input value={item.rest||''} onChange={e=>onChange({...item,rest:e.target.value})} placeholder="e.g. 60s" style={s}/>
          </div>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize:10, color:'#6b6490', marginBottom:4, textTransform:'uppercase', letterSpacing:.06 }}>Notes (optional)</div>
          <input value={item.note||''} onChange={e=>onChange({...item,note:e.target.value})} placeholder="e.g. Keep back straight, slow tempo" style={{...s}}/>
        </div>
      </div>
      <button onClick={onRemove} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:13, flexShrink:0, marginTop:2 }}>✕</button>
    </div>
  )
}

export default function AdminExercises({ apiFetch, ImageUploader, Btn, Card, Modal, FR, inp, Spinner, Table, Td, Badge, C, toast, isMainAdmin=true }) {

  const [tab, setTab] = useState('exercises')

  /* ── Exercises state ── */
  const [exercises, setExercises] = useState([])
  const [exLoading, setExLoading] = useState(true)
  const [exModal,   setExModal]   = useState(null)
  const [exForm,    setExForm]    = useState({})
  const [exSaving,  setExSaving]  = useState(false)
  const [exSearch,  setExSearch]  = useState('')
  const [preview,   setPreview]   = useState(null)

  const setEx = (k, v) => setExForm(f => ({ ...f, [k]: v }))

  const loadExercises = useCallback(async () => {
    try { const d = await apiFetch('/api/admin/exercises'); setExercises(Array.isArray(d) ? d : []) }
    catch { toast('Failed to load exercises','err') }
    setExLoading(false)
  }, [])

  useEffect(() => { loadExercises() }, [loadExercises])

  const closeEx = () => { setExModal(null); setExForm({}) }

  const saveEx = () => {
    setExSaving(true)
    const run = async () => {
      if (!exForm.name?.trim()) return toast('Exercise name required','err')
      exForm.id
        ? await apiFetch(`/api/admin/exercises/${exForm.id}`,'PUT',{...exForm})
        : await apiFetch('/api/admin/exercises','POST',{...exForm})
      await loadExercises(); toast('Exercise saved!','ok'); closeEx()
    }
    run().catch(()=>toast('Save failed','err')).finally(()=>setExSaving(false))
  }

  const delEx = (id) => {
    if (!confirm('Delete this exercise?')) return
    apiFetch(`/api/admin/exercises/${id}`,'DELETE')
      .then(()=>{ loadExercises(); toast('Deleted','ok') })
      .catch(()=>toast('Delete failed','err'))
  }

  const filteredEx = exercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
    (e.muscle||'').toLowerCase().includes(exSearch.toLowerCase())
  )

  /* ── Plans state ── */
  const [plans,        setPlans]        = useState([])
  const [plLoading,    setPlLoading]    = useState(true)
  const [plModal,      setPlModal]      = useState(null)
  const [plForm,       setPlForm]       = useState({})
  const [plSaving,     setPlSaving]     = useState(false)
  const [plSearch,     setPlSearch]     = useState('')
  const [selected,     setSelected]     = useState([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerMuscle, setPickerMuscle] = useState('All')
  const [viewPlan,     setViewPlan]     = useState(null)

  const setPl = (k, v) => setPlForm(f => ({ ...f, [k]: v }))

  const loadPlans = useCallback(async () => {
    try { const d = await apiFetch('/api/admin/workout-plans'); setPlans(Array.isArray(d) ? d : []) }
    catch { toast('Failed to load workout plans','err') }
    setPlLoading(false)
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  const openAddPlan = () => {
    setPlForm({ level:'Beginner' }); setSelected([])
    setPickerSearch(''); setPickerMuscle('All'); setPlModal('add')
  }

  const openEditPlan = (plan) => {
    setPlForm({...plan})
    setSelected(Array.isArray(plan.exercises) ? plan.exercises.map(e=>({...e})) : [])
    setPickerSearch(''); setPickerMuscle('All'); setPlModal('edit')
  }

  const openViewPlan = (plan) => { setViewPlan(plan); setPlModal('view') }
  const closePl = () => { setPlModal(null); setPlForm({}); setSelected([]); setViewPlan(null) }

  const toggleEx = (ex) => {
    setSelected(prev => {
      if (prev.find(s => s.id === ex.id)) return prev.filter(s => s.id !== ex.id)
      return [...prev, { id:ex.id, name:ex.name, muscle:ex.muscle, level:ex.level, ytLink:ex.ytLink, image:ex.image, sets:'', reps:'', rest:'', note:'' }]
    })
  }

  const updateSelEx = (updated) => setSelected(prev => prev.map(s => s.id===updated.id ? updated : s))
  const removeSelEx = (id)      => setSelected(prev => prev.filter(s => s.id !== id))

  const savePlan = async () => {
    if (!plForm.name?.trim())  return toast('Plan name is required','err')
    if (!plForm.level)         return toast('Select a target level','err')
    if (selected.length === 0) return toast('Add at least one exercise','err')
    setPlSaving(true)
    try {
      const payload = { ...plForm, exercises: selected }
      plForm.id
        ? await apiFetch(`/api/admin/workout-plans/${plForm.id}`,'PUT',payload)
        : await apiFetch('/api/admin/workout-plans','POST',payload)
      await loadPlans(); toast('Workout plan saved!','ok'); closePl()
    } catch { toast('Save failed','err') }
    setPlSaving(false)
  }

  const delPlan = async (id) => {
    if (!confirm('Delete this workout plan?')) return
    try { await apiFetch(`/api/admin/workout-plans/${id}`,'DELETE'); await loadPlans(); toast('Deleted','ok') }
    catch { toast('Delete failed','err') }
  }

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(plSearch.toLowerCase()) ||
    (p.level||'').toLowerCase().includes(plSearch.toLowerCase())
  )

  const pickerExercises = exercises.filter(e =>
    (pickerMuscle==='All' || e.muscle===pickerMuscle) &&
    e.name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2 }}>
          {tab==='exercises' ? 'EXERCISE LIBRARY' : 'WORKOUT PLANS'}
        </h2>
        <p style={{ color:C.muted, fontSize:13, marginTop:2 }}>
          {tab==='exercises'
            ? 'Manage exercises shown in the public Exercises page'
            : 'Create curated plans for members by fitness level'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid #2a2347' }}>
        <Tab label="🏋 Exercises"     active={tab==='exercises'} onClick={()=>setTab('exercises')}/>
        <Tab label="📋 Workout Plans" active={tab==='plans'}     onClick={()=>setTab('plans')}/>
      </div>

      {/* ══════════ TAB 1 — EXERCISES ══════════ */}
      {tab==='exercises' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
            <input style={{ ...inp, maxWidth:280 }} placeholder="🔍 Search exercises…" value={exSearch} onChange={e=>setExSearch(e.target.value)}/>
            <Btn onClick={()=>{ setExForm({}); setExModal('add') }}>+ Add Exercise</Btn>
          </div>

          {exLoading
            ? <div style={{ textAlign:'center',padding:60 }}><Spinner size={32}/></div>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:18 }}>
                {filteredEx.map(ex => {
                  const vid   = ex.ytId || ytId(ex.ytLink)
                  const thumb = ex.image || (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : '')
                  const lc    = LEVEL_COLORS[ex.level] || '#888'
                  return (
                    <Card key={ex.id} style={{ overflow:'hidden' }}>
                      <div style={{ position:'relative', height:150, background:'#111', overflow:'hidden' }}>
                        {thumb && <img src={thumb} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}/>}
                        {!thumb && <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13 }}>No image</div>}
                        {vid && (
                          <div onClick={()=>setPreview(vid)} style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                            <div style={{ width:42,height:42,borderRadius:'50%',background:'rgba(255,60,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>▶</div>
                          </div>
                        )}
                        {ex.level && <span style={{ position:'absolute',top:8,right:8,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:`${lc}22`,color:lc }}>{ex.level}</span>}
                      </div>
                      <div style={{ padding:'14px 16px' }}>
                        <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>{ex.name}</div>
                        {ex.muscle && <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>💪 {ex.muscle}</div>}
                        {ex.description && <div style={{ fontSize:12,color:'#555',lineHeight:1.5,marginBottom:8 }}>{ex.description}</div>}
                        {ex.ytLink && <div style={{ fontSize:11,color:'#444',marginBottom:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>🎥 {ex.ytLink}</div>}
                        <div style={{ display:'flex',gap:8 }}>
                          <Btn size="sm" variant="ghost" onClick={()=>{ setExForm({...ex}); setExModal('edit') }}>Edit</Btn>
                          {isMainAdmin && <Btn size="sm" variant="danger" onClick={()=>delEx(ex.id)}>Delete</Btn>}
                        </div>
                      </div>
                    </Card>
                  )
                })}
                {filteredEx.length===0 && <p style={{ color:C.muted,gridColumn:'1/-1',padding:40,textAlign:'center' }}>No exercises found.</p>}
              </div>
            )
          }

          {/* Add/Edit Exercise Modal */}
          {(exModal==='add'||exModal==='edit') && (
            <Modal title={exModal==='add'?'Add Exercise':'Edit Exercise'} onClose={closeEx} wide>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:'clamp(14px,2vw,20px)' }}>
                <div>
                  <FR label="Exercise Name *"><input style={inp} value={exForm.name||''} onChange={e=>setEx('name',e.target.value)} placeholder="e.g. Bench Press" autoFocus/></FR>
                  <FR label="Description (optional)">
                    <textarea style={{ ...inp,resize:'none',height:72 }} value={exForm.description||''} onChange={e=>setEx('description',e.target.value)} placeholder="Brief description of the exercise…"/>
                  </FR>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                    <FR label="Muscle Group">
                      <select style={inp} value={exForm.muscle||''} onChange={e=>setEx('muscle',e.target.value)}>
                        <option value="">— Select —</option>
                        {MUSCLES.map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    </FR>
                    <FR label="Difficulty">
                      <select style={inp} value={exForm.level||''} onChange={e=>setEx('level',e.target.value)}>
                        <option value="">— Select —</option>
                        {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                      </select>
                    </FR>
                  </div>
                  <FR label="YouTube Video Link">
                    <input style={inp} value={exForm.ytLink||''} onChange={e=>setEx('ytLink',e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/>
                  </FR>
                  {exForm.ytLink && ytId(exForm.ytLink) && (
                    <div style={{ marginTop:8,borderRadius:10,overflow:'hidden',border:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:11,color:C.muted,padding:'6px 10px',background:'rgba(255,255,255,0.03)' }}>YouTube Preview</div>
                      <img src={`https://img.youtube.com/vi/${ytId(exForm.ytLink)}/hqdefault.jpg`} alt="" style={{ width:'100%',height:140,objectFit:'cover',display:'block' }}/>
                    </div>
                  )}
                </div>
                <div>
                  <ImageUploader value={exForm.image||''} onChange={v=>setEx('image',v)} label="Exercise Image (optional)" hint="If left blank, YouTube thumbnail is used automatically." maxW={700} aspect="wide"/>
                  <div style={{ background:'rgba(255,255,255,0.02)',border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginTop:8 }}>
                    <div style={{ fontSize:11,color:C.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:.06 }}>📋 Tips</div>
                    <ul style={{ color:'#555',fontSize:12,lineHeight:1.9,paddingLeft:16 }}>
                      <li>Paste any YouTube URL — short or full</li>
                      <li>Image auto-fills from YouTube if no upload</li>
                      <li>Users can play video directly in the card</li>
                      <li>Description appears below exercise name</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:10,marginTop:16 }}>
                <Btn onClick={saveEx} disabled={exSaving} style={{ flex:1,justifyContent:'center' }}>{exSaving?<Spinner/>:'Save Exercise'}</Btn>
                <Btn variant="muted" onClick={closeEx} style={{ flex:1,justifyContent:'center' }}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {/* YouTube preview modal */}
          {preview && (
            <div onClick={()=>setPreview(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
              <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:720 }}>
                <iframe src={`https://www.youtube.com/embed/${preview}?autoplay=1`} style={{ width:'100%',height:400,border:'none',borderRadius:16 }} allow="autoplay; encrypted-media" allowFullScreen/>
                <button onClick={()=>setPreview(null)} style={{ display:'block',margin:'16px auto 0',background:'rgba(255,255,255,0.1)',border:'1px solid #333',color:'#ccc',borderRadius:30,padding:'8px 24px',cursor:'pointer',fontFamily:"'Poppins',sans-serif",fontSize:14 }}>Close ✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB 2 — WORKOUT PLANS ══════════ */}
      {tab==='plans' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
            <input style={{ ...inp, maxWidth:280 }} placeholder="🔍 Search plans…" value={plSearch} onChange={e=>setPlSearch(e.target.value)}/>
            <Btn onClick={openAddPlan}>+ New Plan</Btn>
          </div>

          {plLoading
            ? <div style={{ textAlign:'center',padding:60 }}><Spinner size={32}/></div>
            : filteredPlans.length===0
              ? (
                <div style={{ textAlign:'center', padding:60, color:C.muted }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                  <p>No workout plans yet. Create your first plan!</p>
                </div>
              )
              : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
                  {filteredPlans.map(plan => {
                    const lc = LEVEL_COLORS[plan.level] || '#7c3aed'
                    const exCount = Array.isArray(plan.exercises) ? plan.exercises.length : 0
                    return (
                      <Card key={plan.id} style={{ padding:20 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:`${lc}22`, color:lc, border:`1px solid ${lc}44` }}>
                            {plan.level}
                          </span>
                          <span style={{ fontSize:12, color:C.muted }}>{exCount} exercise{exCount!==1?'s':''}</span>
                        </div>
                        <div style={{ fontWeight:700, fontSize:16, color:'#f0eeff', marginBottom:6 }}>{plan.name}</div>
                        {plan.description && (
                          <p style={{ fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:12,
                            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                            {plan.description}
                          </p>
                        )}
                        {exCount>0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:14 }}>
                            {plan.exercises.slice(0,4).map(ex=>(
                              <span key={ex.id} style={{ padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:600,
                                background:'rgba(124,58,237,0.12)', color:'#bb86fc', border:'1px solid rgba(124,58,237,0.2)' }}>
                                {ex.name}
                              </span>
                            ))}
                            {exCount>4 && <span style={{ padding:'2px 9px', fontSize:10, color:C.muted }}>+{exCount-4} more</span>}
                          </div>
                        )}
                        <div style={{ display:'flex', gap:8 }}>
                          <Btn size="sm" variant="ghost"  onClick={()=>openViewPlan(plan)}>View</Btn>
                          <Btn size="sm" variant="ghost"  onClick={()=>openEditPlan(plan)}>Edit</Btn>
                          {isMainAdmin && <Btn size="sm" variant="danger" onClick={()=>delPlan(plan.id)}>Delete</Btn>}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )
          }

          {/* Add/Edit Plan Modal */}
          {(plModal==='add'||plModal==='edit') && (
            <Modal title={plModal==='add'?'📋 New Workout Plan':'✏️ Edit Workout Plan'} onClose={closePl} wide>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap:14, marginBottom:14 }}>
                <FR label="Plan Name *">
                  <input style={inp} value={plForm.name||''} onChange={e=>setPl('name',e.target.value)} placeholder="e.g. New Joinee Plan" autoFocus/>
                </FR>
                <FR label="Target Level *">
                  <select style={inp} value={plForm.level||'Beginner'} onChange={e=>setPl('level',e.target.value)}>
                    {PLAN_LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </FR>
              </div>
              <FR label="Description (optional)">
                <textarea style={{ ...inp, resize:'none', height:60, marginBottom:16 }}
                  value={plForm.description||''} onChange={e=>setPl('description',e.target.value)}
                  placeholder="Brief overview — who it's for, goals, duration…"/>
              </FR>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap:16 }}>
                {/* Exercise picker */}
                <div>
                  <div style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:.07, marginBottom:10 }}>
                    Select Exercises ({selected.length} selected)
                  </div>
                  <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                    <input style={{ ...inp, flex:1, minWidth:100, padding:'8px 12px', fontSize:12 }}
                      placeholder="🔍 Search…" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/>
                    <select style={{ ...inp, width:'auto', padding:'8px 10px', fontSize:12 }} value={pickerMuscle} onChange={e=>setPickerMuscle(e.target.value)}>
                      {MUSCLES_FILTER.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, paddingRight:2 }}>
                    {pickerExercises.length===0
                      ? <div style={{ textAlign:'center', padding:30, color:C.muted, fontSize:13 }}>No exercises match</div>
                      : pickerExercises.map(ex=>(
                          <ExPickerCard key={ex.id} ex={ex} selected={!!selected.find(s=>s.id===ex.id)} onToggle={toggleEx}/>
                        ))
                    }
                  </div>
                </div>

                {/* Sets/reps detail */}
                <div>
                  <div style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:.07, marginBottom:10 }}>
                    Sets & Reps Details
                  </div>
                  {selected.length===0
                    ? (
                      <div style={{ textAlign:'center', padding:'36px 20px', color:C.muted, fontSize:13,
                        border:'1px dashed #2a2347', borderRadius:12 }}>
                        <div style={{ fontSize:26, marginBottom:8 }}>💪</div>
                        Select exercises from the left
                      </div>
                    )
                    : (
                      <div style={{ maxHeight:360, overflowY:'auto', paddingRight:2 }}>
                        {selected.map(item=>(
                          <ExDetailRow key={item.id} item={item} onChange={updateSelEx} onRemove={()=>removeSelEx(item.id)}/>
                        ))}
                      </div>
                    )
                  }
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <Btn onClick={savePlan} disabled={plSaving} style={{ flex:1,justifyContent:'center' }}>
                  {plSaving ? <Spinner/> : `Save Plan (${selected.length} exercises)`}
                </Btn>
                <Btn variant="muted" onClick={closePl} style={{ flex:1,justifyContent:'center' }}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {/* View Plan Modal */}
          {plModal==='view' && viewPlan && (
            <Modal title={viewPlan.name} onClose={closePl} wide>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
                {viewPlan.level && (
                  <span style={{ padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                    background:`${LEVEL_COLORS[viewPlan.level]||'#7c3aed'}22`,
                    color:LEVEL_COLORS[viewPlan.level]||'#7c3aed',
                    border:`1px solid ${LEVEL_COLORS[viewPlan.level]||'#7c3aed'}44` }}>
                    {viewPlan.level}
                  </span>
                )}
                <span style={{ fontSize:12, color:C.muted }}>
                  {Array.isArray(viewPlan.exercises) ? viewPlan.exercises.length : 0} exercises
                </span>
              </div>
              {viewPlan.description && (
                <p style={{ fontSize:14, color:C.muted, lineHeight:1.7, marginBottom:20,
                  padding:'12px 16px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid #2a2347' }}>
                  {viewPlan.description}
                </p>
              )}
              {Array.isArray(viewPlan.exercises) && viewPlan.exercises.map((ex,i)=>{
                const thumb = ex.image || ytThumb(ex.ytLink)
                const lc = LEVEL_COLORS[ex.level] || '#888'
                return (
                  <div key={ex.id||i} style={{ display:'flex', gap:14, alignItems:'flex-start',
                    padding:'14px 16px', borderRadius:12, marginBottom:10,
                    background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.15)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(124,58,237,0.2)',
                      color:'#bb86fc', fontWeight:700, fontSize:12, display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    {thumb && (
                      <div style={{ width:52, height:52, borderRadius:8, overflow:'hidden', flexShrink:0 }}>
                        <img src={thumb} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'#f0eeff', marginBottom:4 }}>{ex.name}</div>
                      <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>
                        {ex.muscle && <span>💪 {ex.muscle}</span>}
                        {ex.level  && <span style={{ marginLeft:8, color:lc }}>{ex.level}</span>}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {ex.sets && <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(34,197,94,0.12)',  color:'#22c55e' }}>Sets: {ex.sets}</span>}
                        {ex.reps && <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>Reps: {ex.reps}</span>}
                        {ex.rest && <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(124,58,237,0.12)', color:'#bb86fc' }}>Rest: {ex.rest}</span>}
                      </div>
                      {ex.note && <div style={{ marginTop:6, fontSize:12, color:'#6b6490', fontStyle:'italic' }}>📝 {ex.note}</div>}
                    </div>
                  </div>
                )
              })}
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <Btn onClick={()=>{ closePl(); setTimeout(()=>openEditPlan(viewPlan),50) }} style={{ flex:1,justifyContent:'center' }}>✏️ Edit Plan</Btn>
                <Btn variant="muted" onClick={closePl} style={{ flex:1,justifyContent:'center' }}>Close</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  )
}
