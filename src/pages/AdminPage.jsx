import { useState, useEffect, useCallback, useRef } from 'react'
import AdminStore     from '../admin/AdminStore.jsx'
import AdminExercises from '../admin/AdminExercises.jsx'
import AdminPricing   from '../admin/AdminPricing.jsx'

// ─── SECURITY NOTES ───────────────────────────────────────────────────────────
// 1. NO hardcoded credentials. Login is verified server-side via bcrypt.
// 2. JWT token is stored in React state (memory only) — NOT localStorage.
//    This means it vanishes on page refresh (user must re-login), which is
//    correct and safe for an admin panel.
// 3. VITE_ADMIN_SECRET env var has been REMOVED entirely. The frontend
//    never holds a shared secret. Only the JWT issued after login is used.
// 4. All admin API calls send `Authorization: Bearer <token>`.
// ─────────────────────────────────────────────────────────────────────────────

const API   = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const PLANS = ['Monthly – ₹1199','Quarterly – ₹2999','Half Yearly – ₹4999','Yearly – ₹9999']
const uid   = () => Math.random().toString(36).slice(2,9)

// Map plan period string → number of days
const periodToDays = (period='') => {
  const p = period.toLowerCase()
  if (p.includes('year'))    return 365
  if (p.includes('half') || p==='6month' || p==='6months') return 182
  if (p.includes('quarter') || p==='3month') return 91
  if (p==='month' || p==='monthly') return 30
  if (p==='week')  return 7
  if (p==='day')   return 1
  // fallback: try parsing a number from string
  const n = parseInt(p)
  return isNaN(n) ? 30 : n
}

// apiFetch is built at runtime with the current JWT from state (passed as prop)
function makeApiFetch(token) {
  return async function apiFetch(path, method='GET', body=null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(`${API}${path}`, opts)
    if (res.status === 401) {
      // Token expired — bubble up so AdminPage can force logout
      throw Object.assign(new Error('Session expired'), { status: 401 })
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
    return res.json()
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function resizeImage(dataUrl, maxW=800, quality=0.78) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// uploadImageToCloud needs the token at call time — receives it as arg
async function uploadImageToCloud(token, base64, folder='ffc') {
  const res = await fetch(`${API}/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64, folder }),
  })
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:'Upload failed'}))
    throw new Error(err.error || 'Image upload failed')
  }
  const data = await res.json()
  return data.url
}

const C = {
  bg:'#06050f', surface:'#0d0b1a', card:'#130f24', border:'#2a2347',
  accent:'#7c3aed', accentL:'#9c59f7', accentG:'rgba(124,58,237,0.12)',
  text:'#f0eeff', muted:'#6b6490', success:'#22c55e', warn:'#f59e0b', danger:'#ef4444',
}

const CSS = `
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glow   { 0%,100%{text-shadow:0 0 18px rgba(124,58,237,.7)} 50%{text-shadow:0 0 36px rgba(124,58,237,1)} }
  .adm-fade { animation:fadeUp .4s ease both }
  .adm-row:hover td { background:rgba(255,255,255,0.025) }
  .adm-nav { display:flex;align-items:center;gap:11px;padding:13px 22px;cursor:pointer;transition:all .2s;font-size:14px;font-weight:500;border-left:3px solid transparent }
  .adm-nav:hover { color:#7c3aed;background:rgba(124,58,237,0.12) }
  .img-drop { border:2px dashed #2a2347;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:rgba(255,255,255,0.02) }
  .img-drop:hover,.img-drop.drag { border-color:#7c3aed;background:rgba(124,58,237,0.12) }
  .img-drop input[type=file]{ display:none }
  .adm-sidebar-fixed { transition: transform 0.28s cubic-bezier(.4,0,.2,1); }
  .member-card { display:none; }
  @media(max-width:768px){
    .adm-sidebar-fixed { transform: translateX(-100%); position:fixed; z-index:200; }
    .adm-sidebar-fixed.open { transform: translateX(0); box-shadow: 4px 0 40px rgba(0,0,0,0.7); }
    .adm-main { margin-left:0 !important; }
    .adm-table-desktop { display:none !important; }
    .member-card { display:block; }
    .hide-mobile { display:none !important; }
    .adm-hamburger { display:flex !important; }
    .adm-modal-inner { border-radius:20px 20px 0 0 !important; margin-bottom:0 !important; }
  }
  @media(min-width:769px){
    .adm-overlay-bg { display:none !important; }
    .adm-hamburger { display:none !important; }
  }
  /* Sidebar scrollbar styling */
  .adm-sidebar-fixed nav::-webkit-scrollbar { width:3px }
  .adm-sidebar-fixed nav::-webkit-scrollbar-track { background:transparent }
  .adm-sidebar-fixed nav::-webkit-scrollbar-thumb { background:#2a2347; border-radius:3px }
  .adm-sidebar-fixed nav::-webkit-scrollbar-thumb:hover { background:#7c3aed }
`

const Btn = ({ children, onClick, variant='primary', size='md', disabled=false, style:s={} }) => {
  const base = { display:'inline-flex',alignItems:'center',gap:6,cursor:disabled?'not-allowed':'pointer',border:'none',borderRadius:30,fontFamily:"'Poppins',sans-serif",fontWeight:600,transition:'all .2s',whiteSpace:'nowrap',opacity:disabled?0.6:1,padding:size==='sm'?'7px 15px':'11px 22px',fontSize:size==='sm'?12:14,minHeight:size==='sm'?36:44 }
  const V = { primary:{background:'linear-gradient(135deg,#7c3aed,#9c59f7)',color:'#fff',boxShadow:'0 4px 16px rgba(124,58,237,0.35)'}, ghost:{background:'transparent',color:'#bb86fc',border:'1px solid rgba(124,58,237,0.5)'}, danger:{background:'#ef4444',color:'#fff'}, muted:{background:'rgba(255,255,255,0.07)',color:'#f0eeff'}, success:{background:'#22c55e',color:'#fff'} }
  return <button onClick={disabled?undefined:onClick} style={{...base,...V[variant],...s}}>{children}</button>
}

const Badge = ({ label, color }) => {
  const M = { green:['#22c55e','rgba(34,197,94,0.15)'], orange:['#f59e0b','rgba(245,158,11,0.15)'], red:['#ef4444','rgba(239,68,68,0.15)'], accent:['#7c3aed','rgba(124,58,237,0.12)'] }
  const [fg,bg] = M[color]||M.accent
  return <span style={{display:'inline-block',padding:'3px 11px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color:fg}}>{label}</span>
}

const Card = ({ children, style:s={}, className='' }) => (
  <div className={className} style={{background:'#130f24',borderRadius:16,border:'1px solid #2a2347',overflow:'hidden',...s}}>{children}</div>
)

const Modal = ({ title, children, onClose, wide=false }) => (
  <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',zIndex:9999,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}}>
    <div className="adm-fade adm-modal-inner" style={{background:'#130f24',border:'1px solid #2a2347',borderRadius:20,padding:'24px 20px',width:'100%',maxWidth:wide?680:500,maxHeight:'92vh',overflowY:'auto',marginTop:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,color:'#7c3aed'}}>{title}</h3>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6b6490',fontSize:22,cursor:'pointer',padding:'4px 8px',minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      </div>
      {children}
    </div>
  </div>
)

const FR = ({ label, children }) => (
  <div style={{marginBottom:14}}>
    <label style={{fontSize:12,color:'#6b6490',display:'block',marginBottom:5}}>{label}</label>
    {children}
  </div>
)

const inp = {width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid #2a2347',borderRadius:10,color:'#f0eeff',fontFamily:"'Poppins',sans-serif",fontSize:14,outline:'none',transition:'border-color .2s',boxSizing:'border-box'}
const Spinner = ({size=16}) => <span style={{width:size,height:size,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block',flexShrink:0}}/>

const Table = ({ heads, children, empty }) => (
  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
    <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
      <thead><tr>{heads.map(h=><th key={h} style={{padding:'12px 16px',fontSize:11,textTransform:'uppercase',letterSpacing:.08,color:'#6b6490',borderBottom:'1px solid #2a2347',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
    {empty && <p style={{textAlign:'center',color:'#6b6490',padding:40,fontSize:14}}>{empty}</p>}
  </div>
)
const Td = ({children,style:s={}}) => <td className="adm-row" style={{padding:'13px 16px',borderBottom:'1px solid #2a2347',fontSize:14,verticalAlign:'middle',...s}}>{children}</td>

function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:99999,background:type==='ok'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',border:`1px solid ${type==='ok'?'#22c55e':'#ef4444'}`,color:type==='ok'?'#22c55e':'#ef4444',borderRadius:10,padding:'12px 20px',fontSize:14,fontWeight:600,animation:'fadeUp .3s ease',maxWidth:340}}>
      {type==='ok'?'✅':'❌'} {msg}
    </div>
  )
}

// ImageUploader receives token as prop to pass to uploadImageToCloud
function ImageUploader({ token, value, onChange, label='Upload Image', hint='', maxW=800, aspect='wide' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('Image must be under 10MB'); return }
    setUploading(true); setUploadError('')
    try {
      const base64 = await fileToBase64(file)
      const resized = await resizeImage(base64, maxW, aspect==='square' ? 0.8 : 0.78)
      const cloudUrl = await uploadImageToCloud(token, resized, 'ffc')
      onChange(cloudUrl)
    } catch (e) { setUploadError(e.message || 'Upload failed. Try again.') }
    setUploading(false)
  }

  return (
    <div style={{marginBottom:16}}>
      <label style={{fontSize:12,color:'#6b6490',display:'block',marginBottom:8}}>{label}</label>
      {value && (
        <div style={{position:'relative',marginBottom:10,display:'inline-block'}}>
          <img src={value} alt="preview" style={{width:aspect==='square'?100:'100%',height:aspect==='square'?100:180,objectFit:'cover',borderRadius:aspect==='square'?'50%':12,display:'block',border:'2px solid #7c3aed',maxWidth:aspect==='square'?100:'100%'}}/>
          <button onClick={()=>onChange('')} style={{position:'absolute',top:-8,right:-8,width:24,height:24,borderRadius:'50%',background:'#ef4444',border:'none',color:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
      <div className={`img-drop${drag?' drag':''}`} onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);processFile(e.dataTransfer.files[0])}}>
        <input ref={inputRef} type="file" accept="image/*" onChange={e=>processFile(e.target.files[0])}/>
        {uploading ? <><Spinner size={24}/><p style={{color:'#6b6490',fontSize:13,marginTop:8}}>Uploading…</p></> : <><div style={{fontSize:32,marginBottom:8}}>📸</div><p style={{color:'#6b6490',fontSize:13,marginBottom:4}}>{value?'Click or drop to replace':'Click or drop image here'}</p>{hint&&<p style={{color:'#555',fontSize:12}}>{hint}</p>}</>}
        {uploadError&&<p style={{color:'#ef4444',fontSize:12,marginTop:6}}>⚠ {uploadError}</p>}
        {value&&value.startsWith('https://res.cloudinary.com')&&<p style={{color:'#22c55e',fontSize:11,marginTop:6}}>✓ Stored on Cloudinary</p>}
      </div>
    </div>
  )
}

/* ── QR CODE DISPLAY ── */
function QRCodeDisplay({ member }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [err, setErr]     = useState(false)
  const payload = JSON.stringify({ id: member.id, gym: 'FFC' })

  useEffect(() => {
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, payload, {
          width:200, margin:2,
          color:{ dark:'#ffffff', light:'#130f24' },
        }, e => { if (!e) setReady(true) })
      }
    }).catch(() => setErr(true))
  }, [payload])

  const download = () => {
    if (!canvasRef.current) return
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `QR_${member.name?.replace(/\s+/g,'_')}.png`
    a.click()
  }

  return (
    <div style={{textAlign:'center',padding:16}}>
      {err
        ? <div style={{background:'rgba(245,158,11,0.1)',border:'1px solid #f59e0b',borderRadius:12,padding:20}}>
            <p style={{color:'#f59e0b',fontSize:13,marginBottom:8}}>⚠ Install the qrcode package:</p>
            <code style={{background:'rgba(255,255,255,0.05)',padding:'6px 12px',borderRadius:8,fontSize:12,display:'block'}}>npm install qrcode</code>
          </div>
        : <>
            <canvas ref={canvasRef} style={{borderRadius:12,display:'block',margin:'0 auto',border:'2px solid #7c3aed'}}/>
            {ready && <>
              <p style={{fontSize:12,color:'#6b6490',margin:'10px 0 6px'}}>Scan once per day to mark attendance</p>
              <Btn size="sm" onClick={download}>⬇ Download PNG</Btn>
            </>}
            {!ready && !err && <p style={{color:'#6b6490',fontSize:13,marginTop:10}}>Generating QR…</p>}
          </>
      }
    </div>
  )
}

/* ── QR SCANNER ── */
function QRScanner({ apiFetch, onSuccess }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const streamRef = useRef(null)
  const [state, setState] = useState('idle')
  const [msg, setMsg]     = useState('')
  const [memberName, setMemberName] = useState('')

  const stopAll = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  useEffect(() => {
    let jsQR
    import('jsqr').then(m => {
      jsQR = m.default
      navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
        .then(stream => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().then(() => { setState('scanning'); tick(jsQR) })
          }
        })
        .catch(() => { setState('error'); setMsg('Camera access denied. Please allow camera permission.') })
    }).catch(() => { setState('error'); setMsg('Install jsqr: npm install jsqr') })
    return stopAll
  }, [])

  const tick = (jsQR) => {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(() => tick(jsQR)); return
    }
    c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(v, 0, 0)
    const img = ctx.getImageData(0, 0, c.width, c.height)
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts:'dontInvert' })
    if (code) { stopAll(); handleScan(code.data) }
    else rafRef.current = requestAnimationFrame(() => tick(jsQR))
  }

  const handleScan = async (raw) => {
    let payload
    try { payload = JSON.parse(raw) } catch { setState('error'); setMsg('Invalid QR code. Not a FFC QR.'); return }
    if (!payload.id) { setState('error'); setMsg('QR does not contain a valid member ID.'); return }
    setState('loading'); setMsg('Verifying membership…')
    try {
      const data = await apiFetch('/api/admin/attendance/scan', 'POST', { memberId: payload.id })
      if (data.success) {
        setState('ok'); setMemberName(data.memberName||'Member'); setMsg(data.message||'Attendance marked!')
        onSuccess?.()
      } else if (data.code === 'ALREADY') {
        setState('already'); setMemberName(data.memberName||'Member')
      } else {
        setState('error'); setMsg(data.message||'Scan rejected.')
      }
    } catch { setState('error'); setMsg('Server error. Check backend connection.') }
  }

  const reset = () => window.location.reload()

  return (
    <div style={{maxWidth:320,margin:'0 auto'}}>
      <canvas ref={canvasRef} style={{display:'none'}}/>
      {(state==='idle'||state==='scanning') && (
        <div style={{borderRadius:14,overflow:'hidden',border:'2px solid #7c3aed',position:'relative',background:'#000',minHeight:220}}>
          <video ref={videoRef} playsInline muted style={{width:'100%',display:'block'}}/>
          {state==='scanning'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:160,height:160,border:'2px solid rgba(124,58,237,0.8)',borderRadius:10}}/>
          </div>}
        </div>
      )}
      {state==='scanning'&&<p style={{textAlign:'center',color:'#6b6490',fontSize:13,marginTop:10}}>📷 Point at member's QR code…</p>}
      {state==='loading'&&<div style={{textAlign:'center',padding:40}}><Spinner size={32}/><p style={{color:'#6b6490',marginTop:12,fontSize:13}}>{msg}</p></div>}
      {state==='ok'&&<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid #22c55e',borderRadius:14,padding:28,textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:8}}>✅</div>
        <p style={{fontSize:17,fontWeight:700,color:'#22c55e',marginBottom:4}}>{memberName}</p>
        <p style={{fontSize:13,color:'#6b6490',marginBottom:4}}>{msg}</p>
        <p style={{fontSize:11,color:'#6b6490'}}>{new Date().toLocaleString('en-IN')}</p>
        <Btn onClick={reset} style={{marginTop:16,width:'100%',justifyContent:'center'}}>Scan Next Member</Btn>
      </div>}
      {state==='already'&&<div style={{background:'rgba(245,158,11,0.1)',border:'1px solid #f59e0b',borderRadius:14,padding:28,textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:8}}>⚠️</div>
        <p style={{fontSize:17,fontWeight:700,color:'#f59e0b',marginBottom:4}}>{memberName}</p>
        <p style={{fontSize:13,color:'#6b6490',marginBottom:16}}>Already checked in today.</p>
        <Btn onClick={reset} style={{width:'100%',justifyContent:'center'}}>Scan Another</Btn>
      </div>}
      {state==='error'&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid #ef4444',borderRadius:14,padding:28,textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:8}}>❌</div>
        <p style={{fontSize:13,color:'#ef4444',marginBottom:16}}>{msg}</p>
        <Btn onClick={reset} style={{width:'100%',justifyContent:'center'}}>Try Again</Btn>
      </div>}
    </div>
  )
}

/* ── EXPIRY ALERTS ── */
function ExpiryAlerts({ apiFetch, onNavigate }) {
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    apiFetch('/api/admin/members/expiring')
      .then(d => setExpiring(d||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [])

  if (loading || expiring.length === 0) return null

  return (
    <div className="adm-fade" style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:14,marginBottom:24,overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid rgba(245,158,11,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>🔔</span>
          <span style={{fontWeight:700,fontSize:14,color:'#f59e0b'}}>Memberships Expiring Soon</span>
          <span style={{background:'rgba(245,158,11,0.2)',color:'#f59e0b',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>{expiring.length}</span>
        </div>
        {onNavigate&&<button onClick={()=>onNavigate('members')} style={{background:'none',border:'1px solid rgba(245,158,11,0.35)',color:'#f59e0b',borderRadius:8,padding:'5px 12px',fontSize:12,cursor:'pointer',fontWeight:600}}>View All →</button>}
      </div>
      {expiring.map((m,i)=>{
        const red = m.daysLeft<=3
        return (
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 18px',borderBottom:i<expiring.length-1?'1px solid rgba(245,158,11,0.08)':'none',gap:12,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
              <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:red?'#ef4444':'#f59e0b'}}/>
              <div style={{minWidth:0}}>
                <p style={{fontWeight:600,fontSize:14,marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</p>
                <p style={{fontSize:12,color:'#6b6490'}}>{m.phone} · {m.plan?.split('–')[0].trim()}</p>
              </div>
            </div>
            <span style={{background:red?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)',color:red?'#ef4444':'#f59e0b',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700,flexShrink:0}}>
              {m.daysLeft===0?'Expires Today!':`${m.daysLeft}d left`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ── LOGIN PAGE (server-side auth) ── */
function LoginPage({ onLogin }) {
  const [u,setU]=useState(''); const [p,setP]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  const [tab,setTab]=useState('main') // 'main' | 'staff'

  const handle = async () => {
    if (!p) return
    if (tab==='staff' && !u) { setErr('Username required for staff login'); return }
    setLoading(true); setErr('')
    try {
      const body = tab==='main' ? { password: p } : { username: u.trim(), password: p }
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        onLogin(data.token, data.role || 'admin', data.username || 'admin')
      } else {
        setErr(data.error || 'Invalid credentials')
      }
    } catch {
      setErr('Cannot reach server. Check your connection.')
    }
    setLoading(false)
  }

  const TabBtn = ({id,label}) => (
    <button onClick={()=>{setTab(id);setErr('')}} style={{flex:1,padding:'9px 0',background:tab===id?'rgba(124,58,237,0.2)':'transparent',border:'none',borderRadius:8,color:tab===id?'#bb86fc':'#6b6490',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:"'Poppins',sans-serif",transition:'all .2s'}}>
      {label}
    </button>
  )

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse at 60% 40%,rgba(124,58,237,0.15) 0%,#06050f 65%)',padding:16}}>
      <div className="adm-fade" style={{width:'100%',maxWidth:400,textAlign:'center'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',animation:'glow 2.5s infinite',marginBottom:4}}>FFC</div>
        <div style={{fontSize:11,color:'#6b6490',letterSpacing:3,marginBottom:32}}>ADMIN PORTAL</div>
        <Card style={{padding:32}}>
          {/* Tab selector */}
          <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:10,marginBottom:24,border:'1px solid #2a2347'}}>
            <TabBtn id="main"  label="🔐 Main Admin"/>
            <TabBtn id="staff" label="👤 Staff Login"/>
          </div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,marginBottom:20,color:tab==='main'?'#7c3aed':'#9c59f7'}}>
            {tab==='main'?'OWNER / MAIN ADMIN':'STAFF ACCOUNT'}
          </div>
          {tab==='staff'&&(
            <FR label="Username">
              <input style={inp} value={u} onChange={e=>setU(e.target.value)} placeholder="e.g. staff1" autoFocus onKeyDown={e=>e.key==='Enter'&&handle()}/>
            </FR>
          )}
          <FR label="Password">
            <input
              style={inp}
              type="password"
              placeholder="••••••••"
              value={p}
              onChange={e=>setP(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handle()}
              autoFocus={tab==='main'}
            />
          </FR>
          {tab==='staff'&&<div style={{marginBottom:12,padding:'9px 14px',borderRadius:8,background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',fontSize:12,color:'#9d8ec7',textAlign:'left',lineHeight:1.6}}>
            👤 Staff accounts have restricted access. Revenue, Expenses, and Staff Salary sections are visible to main admin only.
          </div>}
          {err&&<p style={{color:'#ef4444',fontSize:12,marginBottom:12,textAlign:'left'}}>⚠ {err}</p>}
          <Btn onClick={handle} disabled={loading} style={{width:'100%',justifyContent:'center',marginTop:8}}>
            {loading?<Spinner/>:'Login →'}
          </Btn>
        </Card>
      </div>
    </div>
  )
}

function Dashboard({ apiFetch, members, products, leads, offers, onNavigate, isMainAdmin, adminUser }) {
  const active  = members.filter(m=>m.status==='Active').length
  const unpaid  = members.filter(m=>m.fee==='Unpaid').length
  const revenue = members.filter(m=>m.fee==='Paid').reduce((s,m)=>{ const n=parseInt(m.plan.replace(/[^\d]/g,'')); return s+(isNaN(n)?0:n) },0)
  const liveOffer = offers.find(o=>o.status==='ON')
  const Stat = ({icon,label,value,color}) => (
    <Card className="adm-fade" style={{padding:'22px 24px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-6,right:-6,fontSize:60,opacity:.05}}>{icon}</div>
      <div style={{fontSize:24,marginBottom:7}}>{icon}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:color||'#7c3aed',letterSpacing:1}}>{value}</div>
      <div style={{fontSize:11,color:'#6b6490',marginTop:2,textTransform:'uppercase',letterSpacing:.05}}>{label}</div>
    </Card>
  )
  return (
    <div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2,marginBottom:6}}>DASHBOARD</h2>
      <p style={{color:'#6b6490',fontSize:14,marginBottom:24}}>Welcome back, <strong style={{color:'#f0eeff'}}>{adminUser||'Admin'}</strong> {isMainAdmin?'👑':'👤'} — {new Date().toDateString()}</p>
      <ExpiryAlerts apiFetch={apiFetch} onNavigate={onNavigate}/>
      {liveOffer&&<div style={{marginBottom:20,padding:'14px 18px',borderRadius:12,background:'rgba(124,58,237,0.1)',border:'1px solid #7c3aed',fontSize:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        {liveOffer.poster&&<img src={liveOffer.poster} alt="" style={{width:48,height:48,objectFit:'cover',borderRadius:8,flexShrink:0}}/>}
        <div><strong style={{color:'#7c3aed'}}>🔴 LIVE on website:</strong> {liveOffer.title}</div>
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:16,marginBottom:28}}>
        <Stat icon="👥" label="Total Members" value={members.length}/>
        <Stat icon="✅" label="Active"         value={active}  color="#22c55e"/>
        <Stat icon="⚠️" label="Unpaid Fees"   value={unpaid}  color="#f59e0b"/>
        {isMainAdmin&&<Stat icon="💰" label="Est. Revenue"  value={`₹${(revenue/1000).toFixed(1)}k`}/>}
        <Stat icon="📬" label="Leads"         value={leads.length}/>
        <Stat icon="🛒" label="Products"      value={products.length} color="#6b6490"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
        <Card>
          <div style={{padding:'16px 18px 12px',fontWeight:600,fontSize:14,borderBottom:'1px solid #2a2347'}}>Recent Members</div>
          <Table heads={['Name','Plan','Status','Fee']}>
            {members.slice(0,5).map(m=>(
              <tr key={m.id} className="adm-row">
                <Td><div style={{fontWeight:500,fontSize:13}}>{m.name}</div><div style={{fontSize:11,color:'#6b6490'}}>{m.phone}</div></Td>
                <Td style={{fontSize:12,color:'#6b6490'}}>{m.plan.split('–')[0].trim()}</Td>
                <Td><Badge label={m.status} color={m.status==='Active'?'green':'red'}/></Td>
                <Td><Badge label={m.fee}    color={m.fee==='Paid'?'green':'orange'}/></Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <div style={{padding:'16px 18px 12px',fontWeight:600,fontSize:14,borderBottom:'1px solid #2a2347'}}>Recent Leads</div>
          <Table heads={['Name','Phone','Date']}>
            {leads.slice(0,5).map(l=>(
              <tr key={l.id} className="adm-row">
                <Td><div style={{fontWeight:500,fontSize:13}}>{l.name}</div><div style={{fontSize:11,color:'#6b6490'}}>{l.email}</div></Td>
                <Td style={{fontSize:13}}>{l.phone}</Td>
                <Td style={{fontSize:12,color:'#6b6490'}}>{l.date}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}

// ── QR PRINT CARD — shown after walk-in registration ──────────────────────────
// Displays a printable / shareable card with the QR code.
// Admin can screenshot it and WhatsApp to member, or print it on paper.
function QRPrintCard({ member, onClose, onNewMember }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const payload = JSON.stringify({ id: member.id, gym: 'FFC' })

  useEffect(() => {
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, payload, {
          width: 220, margin: 2,
          color: { dark: '#ffffff', light: '#130f24' },
        }, e => { if (!e) setReady(true) })
      }
    }).catch(() => {})
  }, [payload])

  const downloadQR = () => {
    if (!canvasRef.current) return
    // Create a nicely styled card image for download / WhatsApp sharing
    const card = document.createElement('canvas')
    card.width  = 480
    card.height = 640
    const ctx = card.getContext('2d')

    // Background
    ctx.fillStyle = '#06050f'
    ctx.fillRect(0, 0, 480, 640)

    // Purple top bar
    const grad = ctx.createLinearGradient(0, 0, 480, 80)
    grad.addColorStop(0, '#7c3aed')
    grad.addColorStop(1, '#9c59f7')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 480, 80)

    // Gym name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('FFC', 240, 38)
    ctx.font = '13px Arial'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText('FRIENDS FITNESS CLUB', 240, 62)

    // QR code
    ctx.drawImage(canvasRef.current, 130, 100, 220, 220)

    // Member info
    ctx.fillStyle = '#f0eeff'
    ctx.font = 'bold 22px Arial'
    ctx.fillText(member.name, 240, 360)

    ctx.fillStyle = '#6b6490'
    ctx.font = '14px Arial'
    ctx.fillText(member.plan?.split('–')[0]?.trim() || '', 240, 388)
    ctx.fillText(`Valid till: ${member.endDate || member.joined}`, 240, 412)

    // Instruction
    ctx.fillStyle = '#7c3aed'
    ctx.font = 'bold 13px Arial'
    ctx.fillText('Scan this QR at the gym entrance every day', 240, 460)

    ctx.fillStyle = '#3a3460'
    ctx.font = '11px Arial'
    ctx.fillText('RT Complex, 2nd Floor, Wardhaman Nagar, Nagpur', 240, 490)
    ctx.fillText('+91 84848 05154', 240, 510)

    // Bottom bar
    ctx.fillStyle = '#130f24'
    ctx.fillRect(0, 560, 480, 80)
    ctx.fillStyle = '#2a2347'
    ctx.fillRect(0, 560, 480, 2)
    ctx.fillStyle = '#6b6490'
    ctx.font = '11px Arial'
    ctx.fillText('Friends Fitness Club · Membership QR Card', 240, 595)
    ctx.fillText('One scan per day · Show at entrance', 240, 615)

    const a = document.createElement('a')
    a.href     = card.toDataURL('image/png')
    a.download = `FFC_Card_${member.name?.replace(/\s+/g, '_')}.png`
    a.click()
  }

  const printCard = () => {
    const w = window.open('', '_blank', 'width=500,height=700')
    const qrSrc = canvasRef.current ? canvasRef.current.toDataURL() : ''
    w.document.write(`
      <html><head><title>FFC Membership Card</title>
      <style>
        body{margin:0;background:#06050f;color:#f0eeff;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;}
        .card{background:#130f24;border:1px solid #2a2347;border-radius:20px;width:340px;overflow:hidden;text-align:center;}
        .top{background:linear-gradient(135deg,#7c3aed,#9c59f7);padding:24px;color:#fff;}
        .top h1{margin:0;font-size:36px;letter-spacing:4px;}
        .top p{margin:4px 0 0;font-size:11px;opacity:.8;letter-spacing:2px;}
        .body{padding:28px 24px;}
        .qr{border-radius:12px;display:block;margin:0 auto 18px;}
        .name{font-size:22px;font-weight:700;margin-bottom:4px;}
        .plan{font-size:13px;color:#6b6490;margin-bottom:4px;}
        .validity{font-size:13px;color:#f59e0b;margin-bottom:18px;}
        .inst{background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:12px;font-size:12px;color:#bb86fc;line-height:1.6;}
        .footer{padding:14px;border-top:1px solid #2a2347;font-size:11px;color:#3a3460;}
        @media print{body{background:#fff;}  .card{border:1px solid #ccc;background:#fff;color:#000;} .top{background:#7c3aed;} .inst{background:#f3f0ff;color:#7c3aed;border-color:#7c3aed;} .footer,.plan,.validity{color:#666;} }
      </style></head><body>
      <div class="card">
        <div class="top"><h1>FFC</h1><p>FRIENDS FITNESS CLUB</p></div>
        <div class="body">
          <img src="${qrSrc}" class="qr" width="200" height="200"/>
          <div class="name">${member.name}</div>
          <div class="plan">${member.plan?.split('–')[0]?.trim() || ''}</div>
          <div class="validity">Valid till: ${member.endDate || member.joined}</div>
          <div class="inst">📲 Show this QR at the gym entrance every day to mark your attendance.<br/>One scan per day.</div>
        </div>
        <div class="footer">RT Complex, 2nd Floor, Wardhaman Nagar, Nagpur · +91 84848 05154</div>
      </div>
      <script>setTimeout(()=>window.print(),600)</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Success banner */}
      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🎉</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#22c55e', marginBottom: 4 }}>Member Registered Successfully!</div>
        <div style={{ fontSize: 13, color: '#6b6490' }}>{member.name} · {member.plan?.split('–')[0]?.trim()}</div>
      </div>

      {/* QR Card preview */}
      <div style={{ background: '#0d0b1a', border: '1px solid #2a2347', borderRadius: 18, padding: 24, marginBottom: 20, display: 'inline-block', minWidth: 260 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 4, background: 'linear-gradient(135deg,#bb86fc,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 4 }}>FFC</div>
        <div style={{ fontSize: 10, color: '#6b6490', letterSpacing: 2, marginBottom: 18 }}>MEMBERSHIP CARD</div>
        <canvas ref={canvasRef} style={{ borderRadius: 10, display: 'block', margin: '0 auto 16px', border: '2px solid #7c3aed' }}/>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 3 }}>{member.name}</div>
        <div style={{ fontSize: 13, color: '#6b6490', marginBottom: 2 }}>{member.plan?.split('–')[0]?.trim()}</div>
        <div style={{ fontSize: 12, color: '#f59e0b' }}>Valid till: {member.endDate || member.joined}</div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Btn onClick={downloadQR} disabled={!ready} style={{ justifyContent: 'center', fontSize: 13 }}>
          📥 Download Card
        </Btn>
        <Btn onClick={printCard} disabled={!ready} variant="muted" style={{ justifyContent: 'center', fontSize: 13 }}>
          🖨️ Print Card
        </Btn>
      </div>

      <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#9d8ec7', lineHeight: 1.8, marginBottom: 16, textAlign: 'left' }}>
        <strong style={{ color: '#bb86fc' }}>No mobile? No problem:</strong><br/>
        📥 Download → WhatsApp the card image to the member<br/>
        🖨️ Print → hand the physical card to the member<br/>
        📷 Screenshot → show on screen, member takes a photo
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn onClick={onNewMember} style={{ flex: 1, justifyContent: 'center' }}>+ Register Another Member</Btn>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Done</Btn>
      </div>
    </div>
  )
}

function Members({ apiFetch, token, members, reload, toast, plans=[], isMainAdmin=true }) {
  const [modal,    setModal]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [qrMember, setQrMember] = useState(null)
  const [newMember,setNewMember]= useState(null)   // shown after walk-in registration

  // Plan period → days map for auto end-date calculation
  const PERIOD_DAYS = { 'Monthly':30, 'Quarterly':91, 'Half Yearly':182, 'Yearly':365 }

  const blank = { name:'', phone:'', email:'', plan:'', joined:new Date().toISOString().slice(0,10), endDate:'', status:'Active', fee:'Paid', ptPlan:false, scanDays:0, accessEndDate:'' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v }
      // Auto-calculate end date when plan or join date changes
      if (k === 'plan' || k === 'joined') {
        const label   = (k === 'plan' ? v : updated.plan).split(/[–-]/)[0].trim()
        const days    = PERIOD_DAYS[label]
        const joinStr = k === 'joined' ? v : updated.joined
        if (days && joinStr) {
          const end = new Date(new Date(joinStr).getTime() + days * 86400000)
          updated.endDate = end.toISOString().slice(0, 10)
        }
      }
      return updated
    })
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search)
  )

  const save = async () => {
    if (!form.name || !form.phone) { toast('Name and phone are required','err'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await apiFetch('/api/admin/members', 'POST', form)
        await reload()
        toast('Member registered! 🎉', 'ok')
        setModal(null)
        // Show QR print card immediately after walk-in registration
        setNewMember({ ...form, id: created.id || created._id || created._uid })
      } else {
        await apiFetch(`/api/admin/members/${modal.id}`, 'PUT', form)
        await reload()
        toast('Member updated!', 'ok')
        setModal(null)
      }
    } catch { toast('Save failed', 'err') }
    setSaving(false)
  }

  const del = async id => {
    if (!confirm('Delete this member?')) return
    try { await apiFetch(`/api/admin/members/${id}`, 'DELETE'); await reload(); toast('Deleted', 'ok') }
    catch { toast('Failed', 'err') }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:2 }}>MEMBERS</h2>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input style={{ ...inp, width:'min(220px,100%)' }} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <Btn onClick={()=>{ setForm(blank); setModal('add') }}>+ Walk-in Register</Btn>
        </div>
      </div>

      {/* Walk-in tip banner */}
      <div style={{ background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:12, padding:'12px 18px', marginBottom:20, fontSize:13, color:'#9d8ec7', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:20 }}>💡</span>
        <span><strong style={{ color:'#bb86fc' }}>No mobile / no internet?</strong> Register the member here → a QR card is instantly generated → download it, print it, or WhatsApp it to the member.</span>
      </div>

      <Card className="adm-table-desktop">
        <Table heads={['Name','Phone','Plan','Joined','Expires','Status','Fee','Actions']} empty={filtered.length===0?'No members found':''}>
          {filtered.map(m=>(
            <tr key={m.id} className="adm-row">
              <Td style={{fontWeight:500}}>{m.name}</Td>
              <Td style={{color:'#6b6490',fontSize:13}}>{m.phone}</Td>
              <Td style={{fontSize:13}}>{m.plan.split('–')[0].trim()}</Td>
              <Td style={{color:'#6b6490',fontSize:13}}>{m.joined}</Td>
              <Td style={{fontSize:13}}>
                <div style={{color: m.endDate && m.endDate < new Date().toISOString().slice(0,10) ? '#ef4444' : '#f59e0b'}}>{m.endDate || '—'}</div>
                {m.ptPlan && <div style={{fontSize:11,color:'#7c3aed',marginTop:2}}>🏋 PT · {m.scanDays||0} scan days</div>}
                {m.ptPlan && m.accessEndDate && <div style={{fontSize:11,color:'#22c55e'}}>Access: {m.accessEndDate}</div>}
              </Td>
              <Td><Badge label={m.status} color={m.status==='Active'?'green':'red'}/></Td>
              <Td><Badge label={m.fee}    color={m.fee==='Paid'?'green':'orange'}/></Td>
              <Td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <Btn size="sm" variant="ghost"  onClick={()=>{setForm({...m,ptPlan:!!m.ptPlan,scanDays:m.scanDays||0,accessEndDate:m.accessEndDate||''});setModal(m)}}>Edit</Btn>
                <Btn size="sm" variant="muted"  onClick={()=>setQrMember(m)}>🪪 Card</Btn>
                {isMainAdmin&&<Btn size="sm" variant="danger" onClick={()=>del(m.id)}>Del</Btn>}
              </div></Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="member-card">
        {filtered.length===0
          ? <p style={{textAlign:'center',color:'#6b6490',padding:40}}>No members found</p>
          : filtered.map(m=>(
            <Card key={m.id} style={{marginBottom:12,padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:8}}>
                <div>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{m.name}</p>
                  <p style={{fontSize:13,color:'#6b6490'}}>{m.phone}</p>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <Badge label={m.status} color={m.status==='Active'?'green':'red'}/>
                  <Badge label={m.fee}    color={m.fee==='Paid'?'green':'orange'}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12,fontSize:12}}>
                <div><span style={{color:'#6b6490'}}>Plan: </span><span>{m.plan.split('–')[0].trim()}</span></div>
                <div><span style={{color:'#6b6490'}}>Joined: </span><span>{m.joined}</span></div>
                <div><span style={{color:'#6b6490'}}>Expires: </span><span style={{color:m.endDate&&m.endDate<new Date().toISOString().slice(0,10)?'#ef4444':'#f59e0b'}}>{m.endDate||'—'}</span></div>{m.ptPlan&&<div style={{fontSize:11,color:'#7c3aed',marginTop:2}}>🏋 PT · {m.scanDays||0} scan days · Access: {m.accessEndDate||'—'}</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <Btn size="sm" variant="ghost"  onClick={()=>{setForm({...m});setModal(m)}} style={{flex:1,justifyContent:'center'}}>Edit</Btn>
                <Btn size="sm" variant="muted"  onClick={()=>setQrMember(m)} style={{flex:1,justifyContent:'center'}}>🪪 Card</Btn>
                {isMainAdmin&&<Btn size="sm" variant="danger" onClick={()=>del(m.id)} style={{flex:1,justifyContent:'center'}}>Del</Btn>}
              </div>
            </Card>
          ))
        }
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <Modal title={modal==='add' ? '🏋 Walk-in Registration' : 'Edit Member'} onClose={()=>setModal(null)} wide>
          {modal==='add' && (
            <div style={{background:'rgba(34,197,94,0.07)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:10,padding:'10px 14px',marginBottom:18,fontSize:13,color:'#6b9e7a',lineHeight:1.7}}>
              ✅ Fill the form and click <strong>Register</strong> — a QR membership card is generated instantly. No mobile or internet needed by the member.
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            <FR label="Full Name *"><input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus/></FR>
            <FR label="Phone *"><input style={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="10-digit mobile number" type="tel"/></FR>
          </div>
          <FR label="Email (optional — for QR email delivery)">
            <input style={inp} value={form.email||''} onChange={e=>set('email',e.target.value)} placeholder="member@email.com" type="email"/>
          </FR>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            <FR label="Plan">
              <select style={inp} value={form.plan} onChange={e=>{
                const val = e.target.value
                const sel = plans.find(p=>p.label===val || p.id===val)
                set('plan', val)
                if (sel && form.joined) {
                  const days = periodToDays(sel.period)
                  const end = new Date(form.joined)
                  end.setDate(end.getDate() + days)
                  set('endDate', end.toISOString().slice(0,10))
                  // If PT plan is checked, also update accessEndDate
                  if (form.ptPlan) {
                    const access = new Date(form.joined)
                    access.setDate(access.getDate() + days * 3)
                    set('accessEndDate', access.toISOString().slice(0,10))
                    set('scanDays', days)
                  }
                }
              }}>
                <option value="">— Select Plan —</option>
                {plans.length > 0
                  ? plans.filter(p=>p.active!==false).map(p=>(
                      <option key={p.id} value={p.label}>{p.label} – ₹{p.effectivePrice||p.price}</option>
                    ))
                  : ['Monthly – ₹1199','Quarterly – ₹2999','Half Yearly – ₹4999','Yearly – ₹9999'].map(p=><option key={p}>{p}</option>)
                }
              </select>
            </FR>
            <FR label="Join / Start Date">
              <input style={inp} type="date" value={form.joined} onChange={e=>{
                const newDate = e.target.value
                set('joined', newDate)
                const sel = plans.find(p=>p.label===form.plan)
                if (sel && newDate) {
                  const days = periodToDays(sel.period)
                  const end = new Date(newDate)
                  end.setDate(end.getDate() + days)
                  set('endDate', end.toISOString().slice(0,10))
                  if (form.ptPlan) {
                    const access = new Date(newDate)
                    access.setDate(access.getDate() + days * 3)
                    set('accessEndDate', access.toISOString().slice(0,10))
                    set('scanDays', days)
                  }
                }
              }}/>
            </FR>
          </div>
          <FR label="Membership End Date (Scan Deadline)">
            <input style={{...inp, color:'#f59e0b'}} type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)}/>
            <div style={{fontSize:11,color:'#6b6490',marginTop:4}}>✨ Auto-calculated from plan + start date. You can override.</div>
          </FR>
          {/* PT Plan Section */}
          <div style={{padding:'14px 16px',background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:10,marginBottom:4}}>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom: form.ptPlan ? 14 : 0}}>
              <input type="checkbox" checked={!!form.ptPlan} onChange={e=>{
                set('ptPlan', e.target.checked)
                if (e.target.checked && form.joined) {
                  const sel = plans.find(p=>p.label===form.plan)
                  const days = sel ? periodToDays(sel.period) : (form.endDate ? Math.round((new Date(form.endDate)-new Date(form.joined))/86400000) : 30)
                  const access = new Date(form.joined)
                  access.setDate(access.getDate() + days * 3)
                  set('accessEndDate', access.toISOString().slice(0,10))
                  set('scanDays', days)
                } else {
                  set('accessEndDate', '')
                  set('scanDays', 0)
                }
              }} style={{width:16,height:16,accentColor:'#7c3aed'}}/>
              <span style={{fontWeight:600,fontSize:13,color:'#bb86fc'}}>🏋 Personal Trainer (PT) Plan</span>
              <span style={{fontSize:11,color:'#6b6490'}}>QR scan days limited + 2× access window</span>
            </label>
            {form.ptPlan && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FR label="Total QR Scan Days">
                  <input style={inp} type="number" value={form.scanDays||''} onChange={e=>set('scanDays',parseInt(e.target.value)||0)} placeholder="e.g. 30"/>
                  <div style={{fontSize:11,color:'#6b6490',marginTop:3}}>Actual paid gym days</div>
                </FR>
                <FR label="Physical Access Window End">
                  <input style={{...inp,color:'#22c55e'}} type="date" value={form.accessEndDate||''} onChange={e=>set('accessEndDate',e.target.value)}/>
                  <div style={{fontSize:11,color:'#6b6490',marginTop:3}}>Last day member can enter gym</div>
                </FR>
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FR label="Status">
              <select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                <option>Active</option><option>Inactive</option>
              </select>
            </FR>
            <FR label="Fee">
              <select style={inp} value={form.fee} onChange={e=>set('fee',e.target.value)}>
                <option>Paid</option><option>Unpaid</option>
              </select>
            </FR>
          </div>
          <div style={{display:'flex',gap:10,marginTop:12}}>
            <Btn onClick={save} disabled={saving} style={{flex:2,justifyContent:'center',fontSize:15}}>
              {saving ? <Spinner/> : modal==='add' ? '🪪 Register & Generate Card' : '💾 Save Changes'}
            </Btn>
            <Btn variant="muted" onClick={()=>setModal(null)} style={{flex:1,justifyContent:'center'}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* QR card viewer for existing members */}
      {qrMember && (
        <Modal title={`🪪 Membership Card — ${qrMember.name}`} onClose={()=>setQrMember(null)} wide>
          <QRPrintCard
            member={qrMember}
            onClose={()=>setQrMember(null)}
            onNewMember={()=>{ setQrMember(null); setForm(blank); setModal('add') }}
          />
        </Modal>
      )}

      {/* Auto-shown after walk-in registration */}
      {newMember && (
        <Modal title="🎉 Registration Complete" onClose={()=>setNewMember(null)} wide>
          <QRPrintCard
            member={newMember}
            onClose={()=>setNewMember(null)}
            onNewMember={()=>{ setNewMember(null); setForm(blank); setModal('add') }}
          />
        </Modal>
      )}
    </div>
  )
}

function Attendance({ apiFetch, reload, toast }) {
  const [todayLog,setTodayLog] = useState([])
  const [loadingLog,setLoadingLog] = useState(true)
  const [tab,setTab] = useState('scan')

  const loadLog = async () => {
    setLoadingLog(true)
    try { const d=await apiFetch('/api/admin/attendance/today'); setTodayLog(d||[]) }
    catch{}
    setLoadingLog(false)
  }
  useEffect(()=>{ loadLog() },[])

  const TabBtn = ({id,label}) => (
    <button onClick={()=>setTab(id)} style={{flex:1,padding:'10px 0',background:tab===id?'#7c3aed':'transparent',border:'none',borderRadius:10,color:tab===id?'#fff':'#6b6490',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:"'Poppins',sans-serif",transition:'all .2s',minHeight:44}}>
      {label}
    </button>
  )
  return(
    <div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2,marginBottom:20}}>ATTENDANCE</h2>
      <div style={{display:'flex',gap:6,background:'#0d0b1a',padding:6,borderRadius:14,marginBottom:24,border:'1px solid #2a2347'}}>
        <TabBtn id="scan" label="📷 Scan QR"/>
        <TabBtn id="log"  label={`📋 Today's Log (${todayLog.length})`}/>
      </div>
      {tab==='scan'&&(
        <div>
          <Card style={{padding:24,marginBottom:20}}>
            <p style={{color:'#6b6490',fontSize:13,marginBottom:20,textAlign:'center',lineHeight:1.7}}>
              Open a member's QR code and point the camera at it.<br/>
              Each member can check in <strong style={{color:'#7c3aed'}}>once per day</strong>.
            </p>
            <QRScanner apiFetch={apiFetch} onSuccess={()=>{ loadLog(); toast('Attendance marked!','ok') }}/>
          </Card>
          <div style={{background:'rgba(124,58,237,0.06)',border:'1px solid #2a2347',borderRadius:12,padding:'14px 18px',fontSize:13,color:'#6b6490',lineHeight:1.7}}>
            💡 Go to <strong style={{color:'#f0eeff'}}>Members</strong> → tap <strong style={{color:'#7c3aed'}}>QR</strong> next to any member to view and download their QR code.
          </div>
        </div>
      )}
      {tab==='log'&&(
        <Card>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #2a2347',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <span style={{fontWeight:600,fontSize:14}}>Today — {new Date().toDateString()}</span>
            <button onClick={loadLog} style={{background:'none',border:'1px solid #2a2347',color:'#6b6490',cursor:'pointer',borderRadius:8,padding:'5px 12px',fontSize:12,minHeight:36}}>↻ Refresh</button>
          </div>
          {loadingLog?<div style={{textAlign:'center',padding:40}}><Spinner size={28}/></div>
           :todayLog.length===0?<p style={{textAlign:'center',color:'#6b6490',padding:40}}>No check-ins today yet.</p>
           :<>
              <div className="adm-table-desktop">
                <Table heads={['Member','Phone','Plan','Time']}>
                  {todayLog.map(a=>(
                    <tr key={a.id} className="adm-row">
                      <Td style={{fontWeight:500}}>{a.memberName}</Td>
                      <Td style={{color:'#6b6490',fontSize:13}}>{a.phone}</Td>
                      <Td style={{fontSize:13}}>{a.plan?.split('–')[0].trim()}</Td>
                      <Td style={{color:'#22c55e',fontSize:13}}>✅ {a.time}</Td>
                    </tr>
                  ))}
                </Table>
              </div>
              <div className="member-card">
                {todayLog.map(a=>(
                  <div key={a.id} style={{padding:'12px 18px',borderBottom:'1px solid #2a2347',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                    <div><p style={{fontWeight:600,fontSize:14,marginBottom:2}}>{a.memberName}</p><p style={{fontSize:12,color:'#6b6490'}}>{a.plan?.split('–')[0].trim()}</p></div>
                    <span style={{color:'#22c55e',fontSize:13,flexShrink:0}}>✅ {a.time}</span>
                  </div>
                ))}
              </div>
           </>
          }
        </Card>
      )}
    </div>
  )
}

function Offers({ apiFetch, token, offers, reload, toast }) {
  const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false)
  const blank={title:'',description:'',btn:'Join Now',link:'/pricing',status:'OFF',poster:''}
  const [form,setForm]=useState(blank); const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const save=async()=>{if(!form.title)return;setSaving(true);try{if(modal==='add')await apiFetch('/api/admin/offers','POST',form);else await apiFetch(`/api/admin/offers/${modal.id}`,'PUT',form);await reload();toast('Offer saved!','ok');setModal(null)}catch{toast('Save failed','err')};setSaving(false)}
  const toggle=async o=>{const u={...o,status:o.status==='ON'?'OFF':'ON'};try{await apiFetch(`/api/admin/offers/${o.id}`,'PUT',u);await reload();toast(u.status==='ON'?'🔴 Offer is LIVE!':'Offer deactivated','ok')}catch{toast('Update failed','err')}}
  const del=async id=>{try{await apiFetch(`/api/admin/offers/${id}`,'DELETE');await reload();toast('Deleted','ok')}catch{toast('Failed','err')}}
  const IU = (props) => <ImageUploader token={token} {...props}/>
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2}}>OFFERS</h2>
        <Btn onClick={()=>{setForm(blank);setModal('add')}}>+ New Offer</Btn>
      </div>
      <div style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:10,padding:'12px 18px',fontSize:13,color:'#ddd',marginBottom:24}}>
        💡 <strong style={{color:'#7c3aed'}}>Activate</strong> an offer → banner appears on homepage.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
        {offers.map(o=>(
          <Card key={o.id} className="adm-fade" style={{overflow:'hidden',border:o.status==='ON'?'2px solid #7c3aed':'1px solid #2a2347',boxShadow:o.status==='ON'?'0 0 24px rgba(124,58,237,0.2)':'none',transition:'all .3s'}}>
            {o.poster?<div style={{position:'relative'}}><img src={o.poster} alt="" style={{width:'100%',height:160,objectFit:'cover',display:'block'}}/>{o.status==='ON'&&<div style={{position:'absolute',top:10,left:10,background:'#7c3aed',color:'#fff',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>🔴 LIVE</div>}</div>:o.status==='ON'&&<div style={{height:6,background:'#7c3aed'}}/>}
            <div style={{padding:22}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,flexWrap:'wrap',gap:8}}>
                <Badge label={o.status==='ON'?'🔴 LIVE':'⚫ Hidden'} color={o.status==='ON'?'green':'red'}/>
                <div style={{display:'flex',gap:6}}><Btn size="sm" variant="ghost" onClick={()=>{setForm({...o});setModal(o)}}>Edit</Btn><Btn size="sm" variant="danger" onClick={()=>del(o.id)}>Del</Btn></div>
              </div>
              <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{o.title}</div>
              <div style={{fontSize:13,color:'#6b6490',marginBottom:16,lineHeight:1.6}}>{o.description}</div>
              <Btn variant={o.status==='ON'?'muted':'primary'} onClick={()=>toggle(o)} style={{fontSize:13,width:'100%',justifyContent:'center'}}>{o.status==='ON'?'⏸ Deactivate':'▶ Activate on Homepage'}</Btn>
            </div>
          </Card>
        ))}
        {offers.length===0&&<p style={{color:'#6b6490',padding:40}}>No offers yet.</p>}
      </div>
      {modal&&(
        <Modal title={modal==='add'?'New Offer':'Edit Offer'} onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20}}>
            <div>
              <FR label="Offer Title *"><input style={inp} value={form.title||''} onChange={e=>set('title',e.target.value)} placeholder="e.g. Summer Sale 🔥"/></FR>
              <FR label="Description"><input style={inp} value={form.description||''} onChange={e=>set('description',e.target.value)}/></FR>
              <FR label="Button Text"><input style={inp} value={form.btn||''} onChange={e=>set('btn',e.target.value)} placeholder="Join Now"/></FR>
              <FR label="Button Link"><input style={inp} value={form.link||''} onChange={e=>set('link',e.target.value)} placeholder="/pricing"/></FR>
              <FR label="Status"><select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}><option value="OFF">OFF – Hidden</option><option value="ON">ON – Live on homepage</option></select></FR>
            </div>
            <div>
              <IU value={form.poster} onChange={v=>set('poster',v)} label="Offer Poster" hint="1200×400px recommended." maxW={1200} aspect="wide"/>
              {form.poster&&<div style={{fontSize:12,color:'#22c55e',marginTop:-8,marginBottom:8}}>✅ Poster uploaded</div>}
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <Btn onClick={save} disabled={saving} style={{flex:1,justifyContent:'center'}}>{saving?<Spinner/>:'Save Offer'}</Btn>
            <Btn variant="muted" onClick={()=>setModal(null)} style={{flex:1,justifyContent:'center'}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Leads({ apiFetch, leads, reload, toast }) {
  const [search,setSearch]=useState('')
  const filtered=leads.filter(l=>l.name.toLowerCase().includes(search.toLowerCase())||l.phone.includes(search))
  const wa=(phone,name)=>window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(`Hello ${name}! Thank you for contacting Friends Fitness Club.`)}`, '_blank')
  const del=async id=>{try{await apiFetch(`/api/admin/leads/${id}`,'DELETE');await reload();toast('Removed','ok')}catch{toast('Failed','err')}}
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div><h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2}}>LEADS</h2><p style={{color:'#6b6490',fontSize:13,marginTop:2}}>Contact form submissions</p></div>
        <input style={{...inp,width:'min(220px,100%)'}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <Card className="adm-table-desktop">
        <Table heads={['Name','Email','Phone','Message','Date','Actions']} empty={filtered.length===0?'No leads yet':''}>
          {filtered.map(l=>(
            <tr key={l.id} className="adm-row">
              <Td style={{fontWeight:500}}>{l.name}</Td><Td style={{color:'#6b6490',fontSize:13}}>{l.email}</Td><Td style={{fontSize:13}}>{l.phone}</Td>
              <Td style={{fontSize:12,color:'#6b6490',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.message}</Td>
              <Td style={{fontSize:12,color:'#6b6490',whiteSpace:'nowrap'}}>{l.date}</Td>
              <Td><div style={{display:'flex',gap:6}}><Btn size="sm" variant="primary" onClick={()=>wa(l.phone,l.name)}>💬 WA</Btn><Btn size="sm" variant="danger" onClick={()=>del(l.id)}>Del</Btn></div></Td>
            </tr>
          ))}
        </Table>
      </Card>
      <div className="member-card">
        {filtered.length===0?<p style={{textAlign:'center',color:'#6b6490',padding:40}}>No leads yet</p>
          :filtered.map(l=>(
          <Card key={l.id} style={{marginBottom:12,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,gap:8}}>
              <div><p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{l.name}</p><p style={{fontSize:12,color:'#6b6490'}}>{l.email}</p></div>
              <p style={{fontSize:12,color:'#6b6490',flexShrink:0}}>{l.date}</p>
            </div>
            <p style={{fontSize:13,marginBottom:4}}>{l.phone}</p>
            <p style={{fontSize:12,color:'#6b6490',marginBottom:14,lineHeight:1.6}}>{l.message}</p>
            <div style={{display:'flex',gap:8}}>
              <Btn size="sm" variant="primary" onClick={()=>wa(l.phone,l.name)} style={{flex:1,justifyContent:'center'}}>💬 WhatsApp</Btn>
              <Btn size="sm" variant="danger"  onClick={()=>del(l.id)} style={{flex:1,justifyContent:'center'}}>Delete</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Trainers({ apiFetch, token, trainers, reload, toast }) {
  const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false)
  const blank={name:'',role:'',exp:'',spec:'',status:'Active',photo:''}
  const [form,setForm]=useState(blank); const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const save=async()=>{if(!form.name)return;setSaving(true);try{if(modal==='add')await apiFetch('/api/admin/trainers','POST',form);else await apiFetch(`/api/admin/trainers/${modal.id}`,'PUT',form);await reload();toast('Trainer saved!','ok');setModal(null)}catch{toast('Save failed','err')};setSaving(false)}
  const del=async id=>{try{await apiFetch(`/api/admin/trainers/${id}`,'DELETE');await reload();toast('Deleted','ok')}catch{toast('Failed','err')}}
  const IU = (props) => <ImageUploader token={token} {...props}/>
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:26,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2}}>TRAINERS</h2>
        <Btn onClick={()=>{setForm(blank);setModal('add')}}>+ Add Trainer</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
        {trainers.map(t=>(
          <Card key={t.id} className="adm-fade" style={{padding:26}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
              <div style={{flexShrink:0}}>{t.photo?<img src={t.photo} alt={t.name} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:'3px solid #7c3aed'}}/>:<div style={{width:72,height:72,borderRadius:'50%',background:'rgba(124,58,237,0.12)',border:'3px solid #7c3aed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>🏋</div>}</div>
              <div><div style={{fontSize:17,fontWeight:700,marginBottom:2}}>{t.name}</div><div style={{fontSize:13,color:'#7c3aed',fontWeight:600}}>{t.role}</div><Badge label={t.status} color={t.status==='Active'?'green':'red'}/></div>
            </div>
            <div style={{fontSize:13,color:'#6b6490',marginBottom:2}}>⏱ {t.exp}</div>
            <div style={{fontSize:13,color:'#6b6490',marginBottom:20}}>🎯 {t.spec}</div>
            <div style={{display:'flex',gap:8}}><Btn size="sm" variant="ghost" onClick={()=>{setForm({...t});setModal(t)}}>Edit</Btn><Btn size="sm" variant="danger" onClick={()=>del(t.id)}>Delete</Btn></div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title={modal==='add'?'Add Trainer':'Edit Trainer'} onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20}}>
            <div>
              <FR label="Full Name *"><input style={inp} value={form.name||''} onChange={e=>set('name',e.target.value)}/></FR>
              <FR label="Role"><input style={inp} value={form.role||''} onChange={e=>set('role',e.target.value)} placeholder="e.g. Head Trainer"/></FR>
              <FR label="Experience"><input style={inp} value={form.exp||''} onChange={e=>set('exp',e.target.value)} placeholder="e.g. 8+ Years"/></FR>
              <FR label="Specialization"><input style={inp} value={form.spec||''} onChange={e=>set('spec',e.target.value)}/></FR>
              <FR label="Status"><select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}><option>Active</option><option>Inactive</option></select></FR>
            </div>
            <IU value={form.photo} onChange={v=>set('photo',v)} label="Trainer Photo" hint="Square photo. Max 5MB." maxW={400} aspect="square"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <Btn onClick={save} disabled={saving} style={{flex:1,justifyContent:'center'}}>{saving?<Spinner/>:'Save Trainer'}</Btn>
            <Btn variant="muted" onClick={()=>setModal(null)} style={{flex:1,justifyContent:'center'}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Settings({ apiFetch, onLogout, isMainAdmin=true, adminUser='admin' }) {
  const [saved,setSaved]=useState(false)
  const [syncing,setSyncing]=useState(false)
  const [syncResult,setSyncResult]=useState(null)
  const [pwForm,setPwForm]=useState({current:'',next:'',confirm:''})
  const [pwMsg,setPwMsg]=useState(null)
  const [pwSaving,setPwSaving]=useState(false)

  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2200)}

  const syncSheets=async()=>{
    setSyncing(true); setSyncResult(null)
    try {
      const data = await apiFetch('/api/admin/sync-sheets','POST')
      if(data.success) setSyncResult({ok:true, msg:`Synced ${data.synced} members to Google Sheets!`})
      else setSyncResult({ok:false, msg:data.error||'Sync failed'})
    } catch(e){ setSyncResult({ok:false, msg:'Server error: '+e.message}) }
    setSyncing(false)
    setTimeout(()=>setSyncResult(null),5000)
  }

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) { setPwMsg({ok:false,msg:'All fields required'}); return }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ok:false,msg:'New passwords do not match'}); return }
    if (pwForm.next.length < 8) { setPwMsg({ok:false,msg:'Password must be at least 8 characters'}); return }
    setPwSaving(true); setPwMsg(null)
    try {
      await apiFetch('/api/admin/change-password','POST',{ currentPassword:pwForm.current, newPassword:pwForm.next })
      setPwMsg({ok:true,msg:'Password changed! ⚠ Update ADMIN_PASSWORD_HASH in Render env vars to persist permanently.'})
      setPwForm({current:'',next:'',confirm:''})
    } catch(e) { setPwMsg({ok:false,msg:e.message||'Failed to change password'}) }
    setPwSaving(false)
  }

  return(
    <div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2,marginBottom:26}}>SETTINGS</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:20}}>
        <Card style={{padding:26}}>
          <div style={{fontWeight:700,fontSize:15,color:'#7c3aed',marginBottom:16}}>Gym Info</div>
          <FR label="Gym Name"><input style={inp} defaultValue="Friends Fitness Club"/></FR>
          <FR label="Phone"><input style={inp} defaultValue="+91 84848 05154"/></FR>
          <FR label="Email"><input style={inp} defaultValue="friendsfitnessclub18@gmail.com"/></FR>
          <FR label="Address"><input style={inp} defaultValue="RT Complex, 2nd Floor, Wardhaman Nagar, Nagpur"/></FR>
          <Btn onClick={save}>{saved?'✓ Saved!':'Save Changes'}</Btn>
        </Card>
        <Card style={{padding:26}}>
          <div style={{fontWeight:700,fontSize:15,color:'#7c3aed',marginBottom:16}}>Timings</div>
          <FR label="Opening"><input style={inp} defaultValue="5:00 AM"/></FR>
          <FR label="Closing"><input style={inp} defaultValue="10:00 PM"/></FR>
          <FR label="Days"><input style={inp} defaultValue="Monday – Saturday"/></FR>
          <FR label="Holiday"><input style={inp} defaultValue="Closed on Sunday"/></FR>
          <Btn onClick={save}>{saved?'✓ Saved!':'Save Timings'}</Btn>
        </Card>
        <Card style={{padding:26,border:'1px solid rgba(124,58,237,0.3)'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#bb86fc',marginBottom:16}}>🔒 Change Password</div>
          <FR label="Current Password"><input style={inp} type="password" value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))}/></FR>
          <FR label="New Password"><input style={inp} type="password" value={pwForm.next} onChange={e=>setPwForm(f=>({...f,next:e.target.value}))}/></FR>
          <FR label="Confirm New Password"><input style={inp} type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))}/></FR>
          {pwMsg&&<div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:pwMsg.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:pwMsg.ok?'#22c55e':'#ef4444',fontSize:13}}>{pwMsg.ok?'✅':'❌'} {pwMsg.msg}</div>}
          <Btn onClick={changePassword} disabled={pwSaving}>{pwSaving?<Spinner/>:'Update Password'}</Btn>
        </Card>
        <Card style={{padding:26,border:'1px solid rgba(34,197,94,0.2)'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#22c55e',marginBottom:10}}>📊 Google Sheets Sync</div>
          <p style={{fontSize:13,color:'#6b6490',marginBottom:14,lineHeight:1.7}}>Sync all member data to your connected Google Sheet.</p>
          {syncResult&&<div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:syncResult.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:syncResult.ok?'#22c55e':'#ef4444',fontSize:13}}>{syncResult.ok?'✅':'❌'} {syncResult.msg}</div>}
          <Btn variant="success" onClick={syncSheets} disabled={syncing}>{syncing?<><Spinner size={13}/> Syncing…</>:'↑ Sync to Google Sheets'}</Btn>
        </Card>
        {isMainAdmin&&<Card style={{padding:26,border:'1px solid rgba(124,58,237,0.25)'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#7c3aed',marginBottom:12}}>👥 Staff Accounts (Sub-Admins)</div>
          <p style={{fontSize:13,color:'#6b6490',marginBottom:14,lineHeight:1.7}}>
            4 staff login accounts are available. Set credentials via environment variables<br/>
            <code style={{background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:6,fontSize:12,color:'#bb86fc'}}>SUB_ADMIN_1=username:password</code> … <code style={{background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:6,fontSize:12,color:'#bb86fc'}}>SUB_ADMIN_4</code>
          </p>
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,border:'1px solid #2a2347',padding:'12px 16px',fontSize:13,lineHeight:2}}>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 16px'}}>
              <span style={{color:'#6b6490'}}>Default logins:</span><span style={{color:'#f0eeff'}}>staff1 / staff1234 &nbsp;•&nbsp; staff2 / staff2234</span>
              <span style={{color:'#6b6490'}}></span><span style={{color:'#f0eeff'}}>staff3 / staff3234 &nbsp;•&nbsp; staff4 / staff4234</span>
              <span style={{color:'#6b6490'}}>Access:</span><span style={{color:'#22c55e'}}>Members, Attendance, Offers, Leads, Trainers, Store, Pricing, Exercises</span>
              <span style={{color:'#6b6490'}}>Restricted:</span><span style={{color:'#ef4444'}}>Revenue, Expenses, Staff Salary (main admin only)</span>
            </div>
          </div>
        </Card>}
        <Card style={{padding:26,border:'1px solid rgba(239,68,68,0.25)'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#ef4444',marginBottom:10}}>Danger Zone</div>
          <p style={{fontSize:13,color:'#6b6490',marginBottom:18,lineHeight:1.7}}>{isMainAdmin?'Logging out will end your admin session.':'You are logged in as a staff account. Logging out will end your session.'}</p>
          {!isMainAdmin&&<p style={{fontSize:12,color:'#f59e0b',marginBottom:14,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'8px 12px'}}>👤 Staff mode — Revenue, Expenses &amp; Staff Salary sections are restricted.</p>}
          <Btn variant="danger" onClick={onLogout}>🚪 Logout</Btn>
        </Card>
      </div>
    </div>
  )
}

const NAV_ALL = [
  {id:'dashboard',  icon:'⚡', label:'Dashboard',  adminOnly:false },
  {id:'members',    icon:'👥', label:'Members',    adminOnly:false },
  {id:'attendance', icon:'📅', label:'Attendance', adminOnly:false },
  {id:'offers',     icon:'🔥', label:'Offers',     adminOnly:false },
  {id:'leads',      icon:'📬', label:'Leads',      adminOnly:false },
  {id:'trainers',   icon:'🏋', label:'Trainers',  adminOnly:false },
  {id:'store',      icon:'🛒', label:'Store',      adminOnly:false },
  {id:'pricing',    icon:'💳', label:'Pricing',    adminOnly:false },
  {id:'exercises',  icon:'🏃', label:'Exercises',  adminOnly:false },
  {id:'revenue',    icon:'📈', label:'Revenue',    adminOnly:true  },
  {id:'expenses',   icon:'💸', label:'Expenses',   adminOnly:true  },
  {id:'staffpay',   icon:'🧾', label:'Staff Salary',adminOnly:true },
  {id:'settings',   icon:'⚙️',  label:'Settings',   adminOnly:false },
]


/* ══════════════════════════════════════════════════════
   EXPENSES SECTION — main admin only
   ══════════════════════════════════════════════════════ */
function Expenses({ apiFetch, toast }) {
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [saving,   setSaving]   = useState(false)
  const CATS = ['Rent','Equipment','Utilities','Salary','Maintenance','Marketing','Supplements','Other']
  const blank = { title:'', amount:'', category:'General', date:new Date().toISOString().slice(0,10), note:'' }
  const [form, setForm] = useState(blank)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = async () => {
    setLoading(true)
    try { setExpenses(await apiFetch('/api/admin/expenses')) } catch{}
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const save = async () => {
    if (!form.title || !form.amount) { toast('Title and amount required','err'); return }
    setSaving(true)
    try {
      if (modal==='add') await apiFetch('/api/admin/expenses','POST',{...form, amount:parseFloat(form.amount)||0})
      else await apiFetch(`/api/admin/expenses/${modal.id}`,'PUT',{...form, amount:parseFloat(form.amount)||0})
      await load(); toast('Saved!','ok'); setModal(null)
    } catch { toast('Save failed','err') }
    setSaving(false)
  }
  const del = async id => {
    if (!confirm('Delete this expense?')) return
    try { await apiFetch(`/api/admin/expenses/${id}`,'DELETE'); await load(); toast('Deleted','ok') }
    catch { toast('Failed','err') }
  }

  const total = expenses.reduce((s,e)=>s+(e.amount||0),0)
  const bycat = {}
  expenses.forEach(e=>{ bycat[e.category]=(bycat[e.category]||0)+(e.amount||0) })

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2}}>EXPENSES</h2>
          <p style={{color:'#6b6490',fontSize:13,marginTop:2}}>Track all gym expenses and costs</p>
        </div>
        <Btn onClick={()=>{setForm(blank);setModal('add')}}>+ Add Expense</Btn>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <Card style={{padding:'18px 20px'}}>
          <div style={{fontSize:22,marginBottom:6}}>💸</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#ef4444'}}>₹{total.toLocaleString('en-IN')}</div>
          <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>Total Expenses</div>
        </Card>
        <Card style={{padding:'18px 20px'}}>
          <div style={{fontSize:22,marginBottom:6}}>📋</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#f59e0b'}}>{expenses.length}</div>
          <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>Total Entries</div>
        </Card>
        {Object.entries(bycat).slice(0,2).map(([cat,amt])=>(
          <Card key={cat} style={{padding:'18px 20px'}}>
            <div style={{fontSize:22,marginBottom:6}}>🏷️</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#7c3aed'}}>₹{amt.toLocaleString('en-IN')}</div>
            <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>{cat}</div>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? <div style={{textAlign:'center',padding:40}}><Spinner size={28}/></div> : (
          <Table heads={['Date','Title','Category','Amount','Note','Actions']} empty={expenses.length===0?'No expenses recorded yet':''}>
            {expenses.map(e=>(
              <tr key={e.id} className="adm-row">
                <Td style={{color:'#6b6490',fontSize:13,whiteSpace:'nowrap'}}>{e.date}</Td>
                <Td style={{fontWeight:500}}>{e.title}</Td>
                <Td><Badge label={e.category||'General'} color="accent"/></Td>
                <Td style={{color:'#ef4444',fontWeight:700}}>₹{(e.amount||0).toLocaleString('en-IN')}</Td>
                <Td style={{color:'#6b6490',fontSize:12,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note||'—'}</Td>
                <Td><div style={{display:'flex',gap:6}}>
                  <Btn size="sm" variant="ghost" onClick={()=>{setForm({...e,amount:String(e.amount||0)});setModal(e)}}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>del(e.id)}>Del</Btn>
                </div></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {modal&&(
        <Modal title={modal==='add'?'Add Expense':'Edit Expense'} onClose={()=>setModal(null)}>
          <FR label="Title *"><input style={inp} value={form.title||''} onChange={e=>set('title',e.target.value)} placeholder="e.g. Monthly Rent" autoFocus/></FR>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FR label="Amount (₹) *"><input style={inp} type="number" value={form.amount||''} onChange={e=>set('amount',e.target.value)} placeholder="0"/></FR>
            <FR label="Date *"><input style={inp} type="date" value={form.date||''} onChange={e=>set('date',e.target.value)}/></FR>
          </div>
          <FR label="Category">
            <select style={inp} value={form.category||'General'} onChange={e=>set('category',e.target.value)}>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </FR>
          <FR label="Note (optional)"><input style={inp} value={form.note||''} onChange={e=>set('note',e.target.value)} placeholder="Any additional details…"/></FR>
          <div style={{display:'flex',gap:10,marginTop:12}}>
            <Btn onClick={save} disabled={saving} style={{flex:1,justifyContent:'center'}}>{saving?<Spinner/>:'Save Expense'}</Btn>
            <Btn variant="muted" onClick={()=>setModal(null)} style={{flex:1,justifyContent:'center'}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   STAFF SALARY SECTION — main admin only
   ══════════════════════════════════════════════════════ */
function StaffSalary({ apiFetch, toast }) {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [saving,  setSaving]  = useState(false)
  const blank = { name:'', role:'', phone:'', email:'', salary:'', joinDate:new Date().toISOString().slice(0,10), endDate:'', status:'Active', note:'' }
  const [form, setForm] = useState(blank)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = async () => {
    setLoading(true)
    try { setStaff(await apiFetch('/api/admin/staff')) } catch{}
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const save = async () => {
    if (!form.name || !form.role) { toast('Name and role required','err'); return }
    setSaving(true)
    try {
      if (modal==='add') await apiFetch('/api/admin/staff','POST',{...form, salary:parseFloat(form.salary)||0})
      else await apiFetch(`/api/admin/staff/${modal.id}`,'PUT',{...form, salary:parseFloat(form.salary)||0})
      await load(); toast('Staff saved!','ok'); setModal(null)
    } catch { toast('Save failed','err') }
    setSaving(false)
  }
  const del = async id => {
    if (!confirm('Remove this staff member?')) return
    try { await apiFetch(`/api/admin/staff/${id}`,'DELETE'); await load(); toast('Deleted','ok') }
    catch { toast('Failed','err') }
  }

  const active    = staff.filter(s=>s.status==='Active')
  const totalSal  = active.reduce((s,st)=>s+(st.salary||0),0)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2}}>STAFF & SALARY</h2>
          <p style={{color:'#6b6490',fontSize:13,marginTop:2}}>Staff records, salaries, join & end dates</p>
        </div>
        <Btn onClick={()=>{setForm(blank);setModal('add')}}>+ Add Staff</Btn>
      </div>

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <Card style={{padding:'18px 20px'}}>
          <div style={{fontSize:22,marginBottom:6}}>👨‍💼</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#7c3aed'}}>{active.length}</div>
          <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>Active Staff</div>
        </Card>
        <Card style={{padding:'18px 20px'}}>
          <div style={{fontSize:22,marginBottom:6}}>🧾</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#f59e0b'}}>₹{totalSal.toLocaleString('en-IN')}</div>
          <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>Monthly Salary Total</div>
        </Card>
        <Card style={{padding:'18px 20px'}}>
          <div style={{fontSize:22,marginBottom:6}}>📋</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#22c55e'}}>{staff.length}</div>
          <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase'}}>Total Staff Records</div>
        </Card>
      </div>

      {/* Desktop table */}
      <Card className="adm-table-desktop">
        {loading ? <div style={{textAlign:'center',padding:40}}><Spinner size={28}/></div> : (
          <Table heads={['Name','Role','Phone','Salary/Month','Join Date','End Date','Status','Actions']} empty={staff.length===0?'No staff records yet':''}>
            {staff.map(s=>(
              <tr key={s.id} className="adm-row">
                <Td>
                  <div style={{fontWeight:600,fontSize:14}}>{s.name}</div>
                  {s.email&&<div style={{fontSize:11,color:'#6b6490'}}>{s.email}</div>}
                </Td>
                <Td style={{fontSize:13,color:'#7c3aed',fontWeight:500}}>{s.role}</Td>
                <Td style={{fontSize:13,color:'#6b6490'}}>{s.phone||'—'}</Td>
                <Td style={{color:'#22c55e',fontWeight:700}}>₹{(s.salary||0).toLocaleString('en-IN')}</Td>
                <Td style={{fontSize:13,color:'#6b6490',whiteSpace:'nowrap'}}>{s.joinDate||'—'}</Td>
                <Td style={{fontSize:13,color:s.endDate?'#ef4444':'#6b6490',whiteSpace:'nowrap'}}>{s.endDate||'—'}</Td>
                <Td><Badge label={s.status||'Active'} color={s.status==='Active'?'green':'red'}/></Td>
                <Td><div style={{display:'flex',gap:6}}>
                  <Btn size="sm" variant="ghost" onClick={()=>{setForm({...s,salary:String(s.salary||0)});setModal(s)}}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>del(s.id)}>Del</Btn>
                </div></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Mobile cards */}
      <div className="member-card">
        {staff.length===0 ? <p style={{textAlign:'center',color:'#6b6490',padding:40}}>No staff records yet</p>
          : staff.map(s=>(
          <Card key={s.id} style={{marginBottom:12,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,gap:8}}>
              <div>
                <p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{s.name}</p>
                <p style={{fontSize:13,color:'#7c3aed',fontWeight:500}}>{s.role}</p>
              </div>
              <Badge label={s.status||'Active'} color={s.status==='Active'?'green':'red'}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12,fontSize:12}}>
              <div><span style={{color:'#6b6490'}}>Salary: </span><span style={{color:'#22c55e',fontWeight:600}}>₹{(s.salary||0).toLocaleString('en-IN')}/mo</span></div>
              <div><span style={{color:'#6b6490'}}>Phone: </span><span>{s.phone||'—'}</span></div>
              <div><span style={{color:'#6b6490'}}>Joined: </span><span>{s.joinDate||'—'}</span></div>
              <div><span style={{color:'#6b6490'}}>End: </span><span style={{color:s.endDate?'#ef4444':'#6b6490'}}>{s.endDate||'—'}</span></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn size="sm" variant="ghost" onClick={()=>{setForm({...s,salary:String(s.salary||0)});setModal(s)}} style={{flex:1,justifyContent:'center'}}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={()=>del(s.id)} style={{flex:1,justifyContent:'center'}}>Del</Btn>
            </div>
          </Card>
        ))}
      </div>

      {modal&&(
        <Modal title={modal==='add'?'Add Staff Member':'Edit Staff Member'} onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            <FR label="Full Name *"><input style={inp} value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus/></FR>
            <FR label="Role / Designation *"><input style={inp} value={form.role||''} onChange={e=>set('role',e.target.value)} placeholder="e.g. Trainer, Receptionist"/></FR>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            <FR label="Phone"><input style={inp} value={form.phone||''} onChange={e=>set('phone',e.target.value)} type="tel" placeholder="10-digit number"/></FR>
            <FR label="Email"><input style={inp} value={form.email||''} onChange={e=>set('email',e.target.value)} type="email" placeholder="staff@example.com"/></FR>
          </div>
          <FR label="Monthly Salary (₹)"><input style={inp} type="number" value={form.salary||''} onChange={e=>set('salary',e.target.value)} placeholder="e.g. 15000"/></FR>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            <FR label="Join Date *"><input style={inp} type="date" value={form.joinDate||''} onChange={e=>set('joinDate',e.target.value)}/></FR>
            <FR label="End Date (leave blank if current)"><input style={{...inp,color:form.endDate?'#ef4444':inp.color}} type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)}/></FR>
          </div>
          <FR label="Status">
            <select style={inp} value={form.status||'Active'} onChange={e=>set('status',e.target.value)}>
              <option>Active</option><option>Inactive</option><option>Resigned</option><option>Terminated</option>
            </select>
          </FR>
          <FR label="Note (optional)"><input style={inp} value={form.note||''} onChange={e=>set('note',e.target.value)} placeholder="Any additional notes…"/></FR>
          <div style={{display:'flex',gap:10,marginTop:12}}>
            <Btn onClick={save} disabled={saving} style={{flex:1,justifyContent:'center'}}>{saving?<Spinner/>:'Save Staff'}</Btn>
            <Btn variant="muted" onClick={()=>setModal(null)} style={{flex:1,justifyContent:'center'}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   REVENUE SECTION — main admin only
   ══════════════════════════════════════════════════════ */
function Revenue({ apiFetch, members, toast }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    apiFetch('/api/admin/revenue')
      .then(d=>setSummary(d))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  },[])

  const paidMembers  = members.filter(m=>m.fee==='Paid')
  const unpaidMembers= members.filter(m=>m.fee==='Unpaid')
  const totalRevenue = paidMembers.reduce((s,m)=>{ const n=parseInt((m.plan||'').replace(/[^\d]/g,'')); return s+(isNaN(n)?0:n) },0)
  const totalExp     = summary ? Object.values(summary.expByMonth||{}).reduce((s,v)=>s+v,0) : 0
  const netProfit    = totalRevenue - totalExp

  const months = summary ? [...new Set([...Object.keys(summary.monthly||{}), ...Object.keys(summary.expByMonth||{})])].sort().reverse().slice(0,12) : []

  return (
    <div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:2,marginBottom:6}}>REVENUE & FINANCE</h2>
      <p style={{color:'#6b6490',fontSize:13,marginBottom:24}}>Financial overview — visible to main admin only 🔐</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:28}}>
        {[
          {icon:'💰',label:'Total Revenue',value:`₹${(totalRevenue/1000).toFixed(1)}k`,color:'#22c55e'},
          {icon:'💸',label:'Total Expenses',value:`₹${(totalExp/1000).toFixed(1)}k`,color:'#ef4444'},
          {icon:'📈',label:'Net Profit',value:`₹${(netProfit/1000).toFixed(1)}k`,color:netProfit>=0?'#22c55e':'#ef4444'},
          {icon:'✅',label:'Paid Members',value:paidMembers.length,color:'#7c3aed'},
          {icon:'⚠️',label:'Unpaid Fees',value:unpaidMembers.length,color:'#f59e0b'},
          {icon:'🧾',label:'Monthly Salary',value:summary?`₹${(summary.totalMonthlySalary/1000).toFixed(1)}k`:'…',color:'#f59e0b'},
        ].map(({icon,label,value,color})=>(
          <Card key={label} style={{padding:'18px 20px'}}>
            <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color}}>{value}</div>
            <div style={{fontSize:11,color:'#6b6490',textTransform:'uppercase',marginTop:2}}>{label}</div>
          </Card>
        ))}
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><Spinner size={28}/></div> : (
        <Card>
          <div style={{padding:'16px 18px 12px',fontWeight:600,fontSize:14,borderBottom:'1px solid #2a2347'}}>Monthly Breakdown</div>
          <Table heads={['Month','Revenue','Expenses','Net']}>
            {months.map(m=>{
              const rev = summary.monthly?.[m]||0
              const exp = summary.expByMonth?.[m]||0
              const net = rev - exp
              return (
                <tr key={m} className="adm-row">
                  <Td style={{fontWeight:500}}>{m}</Td>
                  <Td style={{color:'#22c55e',fontWeight:600}}>₹{rev.toLocaleString('en-IN')}</Td>
                  <Td style={{color:'#ef4444',fontWeight:600}}>₹{exp.toLocaleString('en-IN')}</Td>
                  <Td style={{color:net>=0?'#22c55e':'#ef4444',fontWeight:700}}>₹{net.toLocaleString('en-IN')}</Td>
                </tr>
              )
            })}
            {months.length===0&&<tr><td colSpan={4} style={{textAlign:'center',color:'#6b6490',padding:40}}>No data yet</td></tr>}
          </Table>
        </Card>
      )}
    </div>
  )
}

function Sidebar({ active, onChange, onLogout, collapsed, mobileOpen, onClose, isMainAdmin }) {
  const W = collapsed ? 64 : 220
  return (
    <>
      {mobileOpen&&<div className="adm-overlay-bg" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:198,backdropFilter:'blur(2px)'}}/>}
      <aside className={`adm-sidebar-fixed${mobileOpen?' open':''}`} style={{width:W,height:'100vh',background:'#0d0b1a',borderRight:'1px solid #2a2347',position:'fixed',top:0,left:0,zIndex:199,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:collapsed?'22px 0':'24px 20px',borderBottom:'1px solid #2a2347',display:'flex',alignItems:'center',justifyContent:'space-between',whiteSpace:'nowrap'}}>
          <div style={{textAlign:collapsed?'center':'left'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{collapsed?'F':'FFC'}</div>
            {!collapsed&&<div style={{fontSize:9,color:'#6b6490',letterSpacing:2,marginTop:2}}>ADMIN PORTAL</div>}
          </div>
          {mobileOpen&&<button className="adm-overlay-bg" onClick={onClose} style={{background:'none',border:'none',color:'#6b6490',fontSize:20,cursor:'pointer',padding:'4px 8px',minWidth:40,minHeight:40,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>}
        </div>
        <nav style={{flex:1,padding:'10px 0',overflowY:'auto',overflowX:'hidden',minHeight:0}}>
          {NAV_ALL.filter(n=>!n.adminOnly||isMainAdmin).map(n=>(
            <div key={n.id} className="adm-nav" onClick={()=>{onChange(n.id);onClose?.()}} style={{justifyContent:collapsed?'center':'flex-start',color:active===n.id?'#7c3aed':'#6b6490',background:active===n.id?'rgba(124,58,237,0.12)':'transparent',borderLeft:active===n.id?'3px solid #7c3aed':'3px solid transparent'}}>
              <span style={{fontSize:17}}>{n.icon}</span>
              {!collapsed&&<span>{n.label}</span>}
            </div>
          ))}
          {!collapsed&&!isMainAdmin&&(
            <div style={{margin:'12px 16px 0',padding:'10px 12px',borderRadius:10,background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',fontSize:11,color:'#6b6490',lineHeight:1.6}}>
              👤 Staff mode — Revenue & Finance sections restricted
            </div>
          )}
        </nav>
        <div style={{padding:collapsed?'14px 0':'14px 20px',borderTop:'1px solid #2a2347'}}>
          <div onClick={onLogout} style={{cursor:'pointer',color:'#ef4444',display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,justifyContent:collapsed?'center':'flex-start',padding:'8px 0',minHeight:44}}>
            <span>🚪</span>{!collapsed&&'Logout'}
          </div>
        </div>
      </aside>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   ROOT COMPONENT
   - token lives in React state only (never localStorage)
   - apiFetch is rebuilt any time the token changes
   - 401 from any API call forces logout automatically
   ══════════════════════════════════════════════════════════════ */

function AccessDenied() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16}}>
      <div style={{fontSize:60}}>🔒</div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2,color:'#ef4444'}}>ACCESS RESTRICTED</h2>
      <p style={{color:'#6b6490',fontSize:14,textAlign:'center',maxWidth:320,lineHeight:1.7}}>
        This section is only accessible to the <strong style={{color:'#f0eeff'}}>Main Admin</strong> account.<br/>
        Revenue, Expenses, and Staff Salary data is restricted to the owner.
      </p>
    </div>
  )
}

export default function AdminPage() {
  const [token,setToken]           = useState(null)   // JWT in memory only
  const [adminRole,setAdminRole]   = useState('admin') // 'admin' | 'staff'
  const [adminUser,setAdminUser]   = useState('admin')
  const [page,setPage]             = useState('dashboard')
  const [collapsed,setCollapsed]   = useState(false)
  const [mobileOpen,setMobileOpen] = useState(false)
  const [members,setMembers]       = useState([])
  const [leads,setLeads]           = useState([])
  const [offers,setOffers]         = useState([])
  const [trainers,setTrainers]     = useState([])
  const [products,setProducts]     = useState([])
  const [plans,setPlans]           = useState([])
  const [loading,setLoading]       = useState(true)
  const [toastData,setToastData]   = useState(null)

  const isMainAdmin = adminRole === 'admin'

  const showToast = (msg, type='ok') => { setToastData({msg,type}); setTimeout(()=>setToastData(null),3200) }

  // Build apiFetch bound to current token; auto-logout on 401
  const apiFetch = useCallback((...args) => {
    if (!token) return Promise.reject(new Error('Not authenticated'))
    return makeApiFetch(token)(...args).catch(err => {
      if (err.status === 401) { setToken(null); showToast('Session expired. Please log in again.','err') }
      throw err
    })
  }, [token])

  const loadAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [m,l,o,t,p,pl] = await Promise.all([
        apiFetch('/api/admin/members'),
        apiFetch('/api/admin/leads'),
        apiFetch('/api/admin/offers'),
        apiFetch('/api/admin/trainers'),
        fetch(`${API}/api/products`).then(r=>r.json()).catch(()=>[]),
        apiFetch('/api/admin/plans').catch(()=>[]),
      ])
      setMembers(m); setLeads(l); setOffers(o); setTrainers(t); setProducts(p); setPlans(pl)
    } catch(e) { console.error('loadAll',e) }
    setLoading(false)
  }, [token])

  useEffect(()=>{ loadAll() }, [loadAll])

  const handleLogout = () => { setToken(null); setAdminRole('admin'); setAdminUser('admin'); setPage('dashboard') }

  if (!token) return (
    <>
      <style>{CSS}</style>
      <LoginPage onLogin={(tok, role='admin', username='admin') => {
        setToken(tok)
        setAdminRole(role)
        setAdminUser(username)
      }}/>
    </>
  )

  const SL = collapsed ? 64 : 220

  // Shared props injected into all sub-components
  const shared = {
    apiFetch,
    token,
    ImageUploader: (props) => <ImageUploader token={token} {...props}/>,
    Btn, Card, Modal, FR, inp, Spinner, Table, Td, Badge, C,
    toast: showToast,
  }

  const PAGES = {
    dashboard:  <Dashboard  {...{apiFetch,members,products,leads,offers,isMainAdmin,adminUser}} onNavigate={setPage}/>,
    members:    <Members    {...{apiFetch,token,members,plans,isMainAdmin}} reload={loadAll} toast={showToast}/>,
    attendance: <Attendance {...{apiFetch}} reload={loadAll} toast={showToast}/>,
    offers:     <Offers     {...{apiFetch,token,offers}} reload={loadAll} toast={showToast}/>,
    leads:      <Leads      {...{apiFetch,leads}} reload={loadAll} toast={showToast}/>,
    trainers:   <Trainers   {...{apiFetch,token,trainers}} reload={loadAll} toast={showToast}/>,
    store:      <AdminStore     {...shared}/>,
    pricing:    <AdminPricing   {...shared}/>,
    exercises:  <AdminExercises {...shared}/>,
    // Main-admin-only pages
    revenue:    isMainAdmin ? <Revenue   {...{apiFetch,members}} toast={showToast}/> : <AccessDenied/>,
    expenses:   isMainAdmin ? <Expenses  apiFetch={apiFetch} toast={showToast}/>    : <AccessDenied/>,
    staffpay:   isMainAdmin ? <StaffSalary apiFetch={apiFetch} toast={showToast}/>  : <AccessDenied/>,
    settings:   <Settings  apiFetch={apiFetch} onLogout={handleLogout} isMainAdmin={isMainAdmin} adminUser={adminUser}/>,
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',minHeight:'100vh',background:'#06050f',color:'#f0eeff',fontFamily:"'Poppins',sans-serif"}}>
        <Sidebar active={page} onChange={setPage} onLogout={handleLogout} collapsed={collapsed} mobileOpen={mobileOpen} onClose={()=>setMobileOpen(false)} isMainAdmin={isMainAdmin}/>
        <div className="adm-main" style={{marginLeft:SL,flex:1,display:'flex',flexDirection:'column',transition:'margin-left .3s',minWidth:0}}>
          <div style={{position:'sticky',top:0,zIndex:50,background:'#06050f',borderBottom:'1px solid #2a2347',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px clamp(12px,3vw,26px)',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>setMobileOpen(o=>!o)} className="adm-hamburger" style={{background:'none',border:'none',color:'#6b6490',cursor:'pointer',fontSize:22,display:'none',padding:'4px 8px',minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}>☰</button>
              <button onClick={()=>setCollapsed(c=>!c)} className="hide-mobile" style={{background:'none',border:'none',color:'#6b6490',cursor:'pointer',fontSize:20,minWidth:36,minHeight:36}}>{collapsed?'☰':'✕'}</button>
              {offers.find(o=>o.status==='ON')&&<div style={{fontSize:12,background:'rgba(124,58,237,0.15)',color:'#7c3aed',border:'1px solid rgba(124,58,237,0.3)',borderRadius:20,padding:'3px 12px',fontWeight:600,whiteSpace:'nowrap'}}>🔴 Offer live</div>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <button onClick={loadAll} style={{background:'none',border:'1px solid #2a2347',color:'#6b6490',cursor:'pointer',fontSize:13,borderRadius:8,padding:'6px 12px',minHeight:36,display:'flex',alignItems:'center',gap:4}}>
                {loading?<Spinner size={12}/>:'↻'}<span className="hide-mobile">{loading?'':'Refresh'}</span>
              </button>
              <span className="hide-mobile" style={{fontSize:12,color:'#6b6490'}}>{new Date().toDateString()}</span>
              <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
                {!isMainAdmin&&<span className="hide-mobile" style={{fontSize:11,background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:20,padding:'2px 10px',fontWeight:600}}>Staff</span>}
                {isMainAdmin&&<span className="hide-mobile" style={{fontSize:11,background:'rgba(124,58,237,0.15)',color:'#bb86fc',border:'1px solid rgba(124,58,237,0.3)',borderRadius:20,padding:'2px 10px',fontWeight:600}}>Admin</span>}
                <div title={adminUser} style={{width:32,height:32,borderRadius:'50%',background:isMainAdmin?'rgba(124,58,237,0.12)':'rgba(245,158,11,0.12)',border:`2px solid ${isMainAdmin?'#7c3aed':'#f59e0b'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{isMainAdmin?'👑':'👤'}</div>
              </div>
            </div>
          </div>
          <main key={page} className="adm-fade" style={{padding:'clamp(16px,3vw,30px) clamp(12px,3vw,26px)',flex:1,minWidth:0,overflowX:'hidden'}}>
            {loading&&page==='dashboard'?<div style={{textAlign:'center',padding:80}}><Spinner size={36}/><p style={{color:'#6b6490',marginTop:16,fontSize:14}}>Loading data…</p></div>:PAGES[page]}
          </main>
        </div>
      </div>
      {toastData&&<Toast msg={toastData.msg} type={toastData.type}/>}
    </>
  )
}
