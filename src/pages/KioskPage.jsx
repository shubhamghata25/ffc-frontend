import { useState, useEffect, useRef, useCallback } from 'react'

// ─── 24/7 KIOSK PAGE ──────────────────────────────────────────────────────────
// • No login required — uses a public kiosk endpoint protected by VITE_KIOSK_TOKEN
// • Runs forever — after each scan resets automatically in 4 seconds
// • Green screen = success, Red screen = error/expired/already
// • Camera never stops — true continuous scan loop
// • Works on any tablet/phone mounted at the gym entrance
// ─────────────────────────────────────────────────────────────────────────────

const API          = import.meta.env.VITE_API_URL    || 'http://localhost:4000'
const KIOSK_TOKEN  = import.meta.env.VITE_KIOSK_TOKEN || ''
const RESET_DELAY  = 4000   // ms before returning to scanning after a result
const DEBOUNCE_MS  = 2000   // prevent double-scans of same QR within this window

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #06050f; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeIn  { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: scale(1) } }
  @keyframes pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  @keyframes scanLine {
    0%   { top: 10% }
    100% { top: 85% }
  }
  .kiosk-scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, #7c3aed, #bb86fc, #7c3aed, transparent);
    box-shadow: 0 0 12px 2px rgba(124,58,237,0.8);
    animation: scanLine 2s linear infinite;
    border-radius: 2px;
  }
  .kiosk-result { animation: fadeIn .3s ease both; }
  .kiosk-pulse  { animation: pulse 1.2s ease infinite; }
`

// ── LED indicator component ──
function LED({ color }) {
  const C = {
    green:  { bg: '#22c55e', shadow: '0 0 20px 6px rgba(34,197,94,0.7)',  label: 'READY' },
    red:    { bg: '#ef4444', shadow: '0 0 20px 6px rgba(239,68,68,0.7)',   label: 'ERROR' },
    amber:  { bg: '#f59e0b', shadow: '0 0 20px 6px rgba(245,158,11,0.7)', label: 'WAIT'  },
    purple: { bg: '#7c3aed', shadow: '0 0 20px 6px rgba(124,58,237,0.7)', label: 'SCAN'  },
  }
  const s = C[color] || C.purple
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: s.bg, boxShadow: s.shadow,
        flexShrink: 0,
      }}/>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: s.bg }}>
        {s.label}
      </span>
    </div>
  )
}

// ── Clock shown on kiosk ──
function KioskClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 3, color: '#6b6490' }}>{time}</span>
}

// ── Result overlay (green / red / amber) ──
function ResultOverlay({ result, countdown }) {
  if (!result) return null
  const isOk      = result.code === 'OK'
  const isAlready = result.code === 'ALREADY'
  const isExpired = result.code === 'EXPIRED'
  const isNotFound= result.code === 'NOT_FOUND' || result.code === 'INVALID'

  const bg     = isOk ? 'linear-gradient(160deg,#052e16,#14532d)' : isAlready ? 'linear-gradient(160deg,#1c1400,#3b2700)' : 'linear-gradient(160deg,#1c0606,#450a0a)'
  const border = isOk ? '#22c55e' : isAlready ? '#f59e0b' : '#ef4444'
  const icon   = isOk ? '✅' : isAlready ? '⚠️' : isExpired ? '⏳' : isNotFound ? '❓' : '❌'
  const led    = isOk ? 'green' : isAlready ? 'amber' : 'red'

  return (
    <div className="kiosk-result" style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
      border: `3px solid ${border}`,
      borderRadius: 24,
    }}>
      {/* Big LED strip at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 8,
        background: border,
        boxShadow: `0 0 24px 4px ${border}`,
        borderRadius: '24px 24px 0 0',
      }}/>

      <div className="kiosk-pulse" style={{ fontSize: 'clamp(72px,18vw,120px)', lineHeight: 1, marginBottom: 24 }}>{icon}</div>

      {result.memberName && (
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(28px,8vw,52px)', letterSpacing: 3, color: '#fff', marginBottom: 8, lineHeight: 1 }}>
          {result.memberName}
        </div>
      )}

      <div style={{ fontSize: 'clamp(14px,3.5vw,20px)', color: '#ccc', marginBottom: 8, lineHeight: 1.6, maxWidth: 420 }}>
        {result.message}
      </div>

      {result.plan && (
        <div style={{ fontSize: 'clamp(12px,3vw,16px)', color: '#888', marginBottom: 24 }}>
          {result.plan}
        </div>
      )}

      <LED color={led}/>

      <div style={{
        position: 'absolute', bottom: 20,
        fontSize: 13, color: '#555', letterSpacing: 1,
      }}>
        Resetting in {countdown}s…
      </div>

      {/* Bottom LED strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
        background: border,
        boxShadow: `0 0 24px 4px ${border}`,
        borderRadius: '0 0 24px 24px',
      }}/>
    </div>
  )
}

export default function KioskPage() {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const streamRef   = useRef(null)
  const lastQRRef   = useRef('')      // last scanned QR data
  const lastTimeRef = useRef(0)       // timestamp of last scan
  const processingRef = useRef(false) // prevent concurrent API calls

  const [camState, setCamState]   = useState('starting') // starting | running | denied | error
  const [result,   setResult]     = useState(null)
  const [countdown, setCountdown] = useState(4)
  const [todayCount, setTodayCount] = useState(0)
  const [lastMember, setLastMember] = useState(null)
  const [scanCount, setScanCount]   = useState(0)  // total scans this session

  // ── Load today's count on mount ──
  useEffect(() => {
    fetch(`${API}/api/kiosk/today-count`, {
      headers: { 'x-kiosk-token': KIOSK_TOKEN }
    })
      .then(r => r.json())
      .then(d => setTodayCount(d.count || 0))
      .catch(() => {})
  }, [])

  // ── Handle scan result + auto-reset countdown ──
  const showResult = useCallback((data) => {
    setResult(data)
    if (data.code === 'OK') {
      setTodayCount(c => c + 1)
      setLastMember({ name: data.memberName, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })
      setScanCount(c => c + 1)
    }

    let t = Math.ceil(RESET_DELAY / 1000)
    setCountdown(t)
    const cd = setInterval(() => {
      t -= 1
      setCountdown(t)
      if (t <= 0) clearInterval(cd)
    }, 1000)

    setTimeout(() => {
      setResult(null)
      processingRef.current = false
      lastQRRef.current = ''      // allow re-scan after reset
    }, RESET_DELAY)
  }, [])

  // ── API call to kiosk endpoint ──
  const handleScan = useCallback(async (raw) => {
    if (processingRef.current) return

    // Debounce: skip if same QR scanned within DEBOUNCE_MS
    const now = Date.now()
    if (raw === lastQRRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return

    lastQRRef.current  = raw
    lastTimeRef.current = now
    processingRef.current = true

    let payload
    try { payload = JSON.parse(raw) } catch {
      showResult({ code: 'INVALID', message: 'Invalid QR code. Not a FFC membership QR.' })
      return
    }

    if (!payload.id || payload.gym !== 'FFC') {
      showResult({ code: 'NOT_FOUND', message: 'This QR is not a valid FFC membership QR. Please get your QR card from reception.' })
      return
    }

    try {
      const res  = await fetch(`${API}/api/kiosk/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kiosk-token': KIOSK_TOKEN },
        body: JSON.stringify({ memberId: payload.id }),
      })
      const data = await res.json()
      showResult(data)
    } catch {
      showResult({ code: 'ERROR', message: 'Server unreachable. Please check internet connection.' })
    }
  }, [showResult])

  // ── QR scan loop ──
  const tick = useCallback((jsQR) => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return

    if (v.readyState === v.HAVE_ENOUGH_DATA && !processingRef.current) {
      c.width  = v.videoWidth
      c.height = v.videoHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(v, 0, 0)
      const img  = ctx.getImageData(0, 0, c.width, c.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (code) handleScan(code.data)
    }

    rafRef.current = requestAnimationFrame(() => tick(jsQR))
  }, [handleScan])

  // ── Start camera ──
  useEffect(() => {
    let jsQR
    import('jsqr')
      .then(m => { jsQR = m.default })
      .catch(() => { setCamState('error'); return })

    const constraints = {
      video: {
        facingMode: 'environment',
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setCamState('running')
            rafRef.current = requestAnimationFrame(() => tick(jsQR))
          })
        }
      })
      .catch(err => {
        if (err.name === 'NotAllowedError') setCamState('denied')
        else setCamState('error')
      })

    // Keep screen awake (Wake Lock API)
    let wakeLock = null
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(wl => { wakeLock = wl })
        .catch(() => {})
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      wakeLock?.release().catch(() => {})
    }
  }, [tick])

  // ── FULLSCREEN on tap (helps on mobile kiosks) ──
  const goFullscreen = () => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }

  return (
    <>
      <style>{CSS}</style>
      <div
        onClick={goFullscreen}
        style={{
          minHeight: '100dvh', background: '#06050f',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Poppins',sans-serif", color: '#f0eeff',
          userSelect: 'none', overflow: 'hidden',
        }}
      >
        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px clamp(16px,4vw,32px)',
          borderBottom: '1px solid #2a2347',
          background: '#0d0b1a', flexShrink: 0, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(22px,5vw,30px)',
              letterSpacing: 4,
              background: 'linear-gradient(135deg,#bb86fc,#7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>FFC</div>
            <div style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#6b6490', letterSpacing: 2, lineHeight: 1.4 }}>
              ATTENDANCE<br/>KIOSK
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <LED color={result ? (result.code==='OK'?'green': result.code==='ALREADY'?'amber':'red') : camState==='running'?'purple':'amber'}/>
            <KioskClock/>
          </div>
        </div>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,4vw,32px)', gap: 24 }}>

          {/* Camera box */}
          <div style={{
            position: 'relative',
            width: '100%', maxWidth: 500,
            aspectRatio: '4/3',
            borderRadius: 24,
            overflow: 'hidden',
            border: result
              ? `3px solid ${result.code==='OK'?'#22c55e':result.code==='ALREADY'?'#f59e0b':'#ef4444'}`
              : '3px solid #7c3aed',
            boxShadow: result
              ? `0 0 40px 8px ${result.code==='OK'?'rgba(34,197,94,0.35)':result.code==='ALREADY'?'rgba(245,158,11,0.35)':'rgba(239,68,68,0.35)'}`
              : '0 0 40px 8px rgba(124,58,237,0.25)',
            background: '#000',
            transition: 'border-color .3s, box-shadow .3s',
          }}>
            <video
              ref={videoRef}
              playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }}/>

            {/* Scanning line (only when idle) */}
            {!result && camState === 'running' && <div className="kiosk-scan-line"/>}

            {/* Corner brackets */}
            {!result && camState === 'running' && <>
              {[['0%','0%','right','bottom'],['0%','auto','right','top'],['auto','0%','left','bottom'],['auto','auto','left','top']].map(([t,b,r,l],i)=>(
                <div key={i} style={{
                  position:'absolute', top:t, bottom:b, right:r==='right'?undefined:r, left:l==='left'?undefined:l,
                  width:36, height:36,
                  borderTop:   (t==='0%') ? '3px solid #7c3aed' : 'none',
                  borderBottom:(b==='0%') ? '3px solid #7c3aed' : 'none',
                  borderRight: (r==='right') ? '3px solid #7c3aed' : 'none',
                  borderLeft:  (l==='left')  ? '3px solid #7c3aed' : 'none',
                  margin: 14,
                }}/>
              ))}
            </>}

            {/* Result overlay */}
            <ResultOverlay result={result} countdown={countdown}/>

            {/* Camera not started states */}
            {camState === 'starting' && !result && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.9)',gap:16 }}>
                <div style={{ width:40,height:40,border:'3px solid rgba(255,255,255,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
                <p style={{ color:'#6b6490',fontSize:14 }}>Starting camera…</p>
              </div>
            )}
            {camState === 'denied' && !result && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.95)',gap:12,padding:24,textAlign:'center' }}>
                <div style={{ fontSize:48 }}>🚫</div>
                <p style={{ color:'#ef4444',fontWeight:700,fontSize:16 }}>Camera Access Denied</p>
                <p style={{ color:'#6b6490',fontSize:13,lineHeight:1.7 }}>
                  Go to browser settings → allow camera for this site → refresh the page.
                </p>
              </div>
            )}
            {camState === 'error' && !result && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.95)',gap:12,padding:24,textAlign:'center' }}>
                <div style={{ fontSize:48 }}>⚠️</div>
                <p style={{ color:'#f59e0b',fontWeight:700,fontSize:16 }}>Camera Error</p>
                <p style={{ color:'#6b6490',fontSize:13 }}>No camera found or jsqr not installed.<br/>Run: <code style={{background:'#1a1a2e',padding:'2px 6px',borderRadius:4}}>npm install jsqr</code></p>
              </div>
            )}
          </div>

          {/* Instruction */}
          {!result && (
            <p style={{ fontSize:'clamp(15px,3.5vw,20px)', color: camState==='running'?'#9d8ec7':'#555', textAlign:'center', letterSpacing:1, lineHeight:1.6 }}>
              {camState==='running' ? '📲 Hold your QR code in front of the camera' : '⏳ Starting camera…'}
            </p>
          )}

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: 'clamp(12px,4vw,32px)',
            background: '#0d0b1a', border: '1px solid #2a2347',
            borderRadius: 16, padding: 'clamp(12px,3vw,20px) clamp(16px,5vw,36px)',
            flexWrap: 'wrap', justifyContent: 'center', width:'100%', maxWidth:500,
          }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,6vw,40px)', color:'#7c3aed', letterSpacing:2 }}>{todayCount}</div>
              <div style={{ fontSize:'clamp(10px,2.5vw,12px)', color:'#6b6490', textTransform:'uppercase', letterSpacing:1 }}>Today</div>
            </div>
            <div style={{ width:1, background:'#2a2347', alignSelf:'stretch' }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,6vw,40px)', color:'#22c55e', letterSpacing:2 }}>{scanCount}</div>
              <div style={{ fontSize:'clamp(10px,2.5vw,12px)', color:'#6b6490', textTransform:'uppercase', letterSpacing:1 }}>This Session</div>
            </div>
            {lastMember && <>
              <div style={{ width:1, background:'#2a2347', alignSelf:'stretch' }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'clamp(12px,3vw,15px)', fontWeight:700, color:'#f0eeff' }}>{lastMember.name}</div>
                <div style={{ fontSize:'clamp(10px,2.5vw,12px)', color:'#6b6490' }}>Last at {lastMember.time}</div>
              </div>
            </>}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '10px clamp(16px,4vw,32px)',
          borderTop: '1px solid #2a2347',
          background: '#0d0b1a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: '#3a3460', flexShrink: 0, flexWrap:'wrap', gap:8,
        }}>
          <span>Friends Fitness Club · RT Complex, Wardhaman Nagar, Nagpur</span>
          <span>Tap screen for fullscreen · 24/7 Auto Kiosk</span>
        </div>
      </div>
    </>
  )
}
