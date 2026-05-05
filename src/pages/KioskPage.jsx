import { useState, useEffect, useRef, useCallback } from 'react'

const API         = import.meta.env.VITE_API_URL    || 'http://localhost:4000'
const KIOSK_TOKEN = import.meta.env.VITE_KIOSK_TOKEN || ''
const RESET_MS    = 4000
const DEBOUNCE_MS = 2500

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #06050f; overflow: hidden; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeIn  { from { opacity:0; transform:scale(.93) } to { opacity:1; transform:scale(1) } }
  @keyframes pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
  @keyframes scanLine { 0%{top:8%} 100%{top:88%} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.25} }
  .k-result { animation: fadeIn .25s ease both; }
  .k-pulse  { animation: pulse 1.1s ease infinite; }
  .k-scan-line {
    position:absolute; left:0; right:0; height:3px; pointer-events:none;
    background:linear-gradient(90deg,transparent,#7c3aed,#bb86fc,#7c3aed,transparent);
    box-shadow:0 0 14px 3px rgba(124,58,237,0.8);
    animation:scanLine 2s linear infinite;
  }
  .k-blink { animation: blink 1.6s ease infinite; }
`

function LED({ color }) {
  const M = {
    green:  ['#22c55e','0 0 18px 5px rgba(34,197,94,.7)',  'READY'],
    red:    ['#ef4444','0 0 18px 5px rgba(239,68,68,.7)',  'ERROR'],
    amber:  ['#f59e0b','0 0 18px 5px rgba(245,158,11,.7)','WAIT' ],
    purple: ['#7c3aed','0 0 18px 5px rgba(124,58,237,.7)','SCAN' ],
  }
  const [bg, shadow, label] = M[color] || M.purple
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div className="k-blink" style={{width:16,height:16,borderRadius:'50%',background:bg,boxShadow:shadow,flexShrink:0}}/>
      <span style={{fontFamily:"'Poppins',sans-serif",fontSize:12,fontWeight:700,letterSpacing:2,color:bg}}>{label}</span>
    </div>
  )
}

function Clock() {
  const [t,setT]=useState('')
  useEffect(()=>{
    const tick=()=>setT(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}))
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  },[])
  return <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,color:'#6b6490'}}>{t}</span>
}

function Corners() {
  return (<>
    {[{top:12,left:12},{top:12,right:12},{bottom:12,left:12},{bottom:12,right:12}].map((pos,i)=>(
      <div key={i} style={{
        position:'absolute',...pos,width:32,height:32,pointerEvents:'none',
        borderTop:   pos.top!==undefined   ?'3px solid rgba(124,58,237,0.8)':'none',
        borderBottom:pos.bottom!==undefined?'3px solid rgba(124,58,237,0.8)':'none',
        borderLeft:  pos.left!==undefined  ?'3px solid rgba(124,58,237,0.8)':'none',
        borderRight: pos.right!==undefined ?'3px solid rgba(124,58,237,0.8)':'none',
      }}/>
    ))}
  </>)
}

function ResultOverlay({result,countdown}){
  if(!result) return null
  const ok=result.code==='OK', alr=result.code==='ALREADY'
  const col=ok?'#22c55e':alr?'#f59e0b':'#ef4444'
  const icon=ok?'✅':alr?'⚠️':result.code==='EXPIRED'?'⏳':'❌'
  return (
    <div className="k-result" style={{
      position:'absolute',inset:0,zIndex:50,borderRadius:'inherit',
      background:ok?'linear-gradient(160deg,#041f0f,#0a3d1f)':alr?'linear-gradient(160deg,#1a1000,#352100)':'linear-gradient(160deg,#1a0404,#3d0a0a)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:28,textAlign:'center',
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:6,background:col,boxShadow:`0 0 20px 4px ${col}`,borderRadius:'20px 20px 0 0'}}/>
      <div className="k-pulse" style={{fontSize:'clamp(64px,16vw,108px)',lineHeight:1,marginBottom:20}}>{icon}</div>
      {result.memberName&&<div style={{fontFamily:"'Bebas Neue',cursive",fontSize:'clamp(26px,7vw,48px)',letterSpacing:3,color:'#fff',marginBottom:6,lineHeight:1}}>{result.memberName}</div>}
      <div style={{fontSize:'clamp(13px,3.2vw,18px)',color:'#ccc',marginBottom:6,lineHeight:1.65,maxWidth:380}}>{result.message}</div>
      {result.plan&&<div style={{fontSize:'clamp(11px,2.5vw,14px)',color:'#6b6490',marginBottom:20}}>{result.plan}</div>}
      <LED color={ok?'green':alr?'amber':'red'}/>
      <div style={{position:'absolute',bottom:16,fontSize:12,color:'#444',letterSpacing:1}}>Resetting in {countdown}s…</div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:6,background:col,boxShadow:`0 0 20px 4px ${col}`,borderRadius:'0 0 20px 20px'}}/>
    </div>
  )
}

export default function KioskPage() {
  const videoRef       = useRef(null)
  const canvasRef      = useRef(null)
  const rafRef         = useRef(null)
  const streamRef      = useRef(null)
  const jsQRRef        = useRef(null)   // jsQR function stored here after load
  const lastQRRef      = useRef('')
  const lastTimeRef    = useRef(0)
  const processingRef  = useRef(false)
  const mountedRef     = useRef(true)

  const [camState,     setCamState]     = useState('starting')
  const [result,       setResult]       = useState(null)
  const [countdown,    setCountdown]    = useState(4)
  const [todayCount,   setTodayCount]   = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [lastMember,   setLastMember]   = useState(null)
  const [debugMsg,     setDebugMsg]     = useState('')

  useEffect(()=>{
    fetch(`${API}/api/kiosk/today-count`,{headers:{'x-kiosk-token':KIOSK_TOKEN}})
      .then(r=>r.json()).then(d=>setTodayCount(d.count||0)).catch(()=>{})
  },[])

  const showResult = useCallback((data)=>{
    if (!mountedRef.current) return
    setResult(data)
    if (data.code==='OK') {
      setTodayCount(c=>c+1); setSessionCount(c=>c+1)
      setLastMember({name:data.memberName,time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})})
    }
    let t=Math.ceil(RESET_MS/1000); setCountdown(t)
    const iv=setInterval(()=>{t-=1;setCountdown(t);if(t<=0)clearInterval(iv)},1000)
    setTimeout(()=>{
      if(!mountedRef.current) return
      setResult(null); processingRef.current=false; lastQRRef.current=''
    },RESET_MS)
  },[])

  const handleScan = useCallback(async (raw)=>{
    if(processingRef.current) return
    const now=Date.now()
    if(raw===lastQRRef.current && now-lastTimeRef.current<DEBOUNCE_MS) return
    lastQRRef.current=raw; lastTimeRef.current=now; processingRef.current=true

    let payload
    try { payload=JSON.parse(raw) } catch {
      showResult({code:'INVALID',message:'Not a valid FFC QR code. Please collect your QR card from reception.'})
      return
    }
    if(!payload.id || payload.gym!=='FFC') {
      showResult({code:'INVALID',message:'This QR does not belong to FFC. Please contact reception.'})
      return
    }
    try {
      const res=await fetch(`${API}/api/kiosk/scan`,{
        method:'POST',
        headers:{'Content-Type':'application/json','x-kiosk-token':KIOSK_TOKEN},
        body:JSON.stringify({memberId:payload.id}),
      })
      const data=await res.json()
      showResult(data)
    } catch {
      showResult({code:'ERROR',message:'Cannot reach server. Please check internet connection.'})
    }
  },[showResult])

  // ── Scan loop — runs every animation frame ────────────────────────────────
  // Uses a ref-based tick so it never stales on re-renders
  const tickRef = useRef(null)
  tickRef.current = ()=>{
    const v=videoRef.current, c=canvasRef.current, jsQR=jsQRRef.current
    if(!v||!c||!jsQR||processingRef.current){
      rafRef.current=requestAnimationFrame(tickRef.current); return
    }
    if(v.readyState>=v.HAVE_ENOUGH_DATA && v.videoWidth>0){
      c.width=v.videoWidth; c.height=v.videoHeight
      const ctx=c.getContext('2d',{willReadFrequently:true})
      ctx.drawImage(v,0,0,c.width,c.height)
      const img=ctx.getImageData(0,0,c.width,c.height)
      const code=jsQR(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'})
      if(code && code.data) { handleScan(code.data) }
    }
    rafRef.current=requestAnimationFrame(tickRef.current)
  }

  // ── Camera startup ────────────────────────────────────────────────────────
  useEffect(()=>{
    mountedRef.current = true

    // 1. Load jsQR
    import('jsqr').then(m=>{
      if(!mountedRef.current) return
      jsQRRef.current = m.default

      // 2. Start camera
      navigator.mediaDevices.getUserMedia({
        video:{ facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720} }
      }).then(stream=>{
        if(!mountedRef.current){ stream.getTracks().forEach(t=>t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if(!video) return
        video.srcObject = stream
        video.onloadedmetadata = ()=>{
          video.play().then(()=>{
            if(!mountedRef.current) return
            setCamState('running')
            // 3. Start scan loop only after video is playing
            rafRef.current = requestAnimationFrame(tickRef.current)
          }).catch(e=>{
            if(!mountedRef.current) return
            setDebugMsg('Video play error: '+e.message); setCamState('error')
          })
        }
      }).catch(err=>{
        if(!mountedRef.current) return
        if(err.name==='NotAllowedError'||err.name==='PermissionDeniedError') setCamState('denied')
        else { setDebugMsg(err.name+': '+err.message); setCamState('error') }
      })
    }).catch(err=>{
      if(!mountedRef.current) return
      setDebugMsg('jsQR failed to load: '+err.message); setCamState('error')
    })

    // Wake lock
    let wakeLock=null
    if('wakeLock' in navigator) navigator.wakeLock.request('screen').then(wl=>wakeLock=wl).catch(()=>{})
    const onVis=()=>{ if(document.visibilityState==='visible'&&'wakeLock' in navigator) navigator.wakeLock.request('screen').then(wl=>wakeLock=wl).catch(()=>{}) }
    document.addEventListener('visibilitychange',onVis)

    return ()=>{
      mountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t=>t.stop())
      wakeLock?.release().catch(()=>{})
      document.removeEventListener('visibilitychange',onVis)
    }
  },[handleScan])

  const goFS=()=>{ const el=document.documentElement; if(el.requestFullscreen) el.requestFullscreen(); else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen() }

  const borderCol = result ? (result.code==='OK'?'#22c55e':result.code==='ALREADY'?'#f59e0b':'#ef4444') : '#7c3aed'
  const glowCol   = result ? (result.code==='OK'?'rgba(34,197,94,.4)':result.code==='ALREADY'?'rgba(245,158,11,.4)':'rgba(239,68,68,.4)') : 'rgba(124,58,237,.2)'
  const ledCol    = result ? (result.code==='OK'?'green':result.code==='ALREADY'?'amber':'red') : camState==='running'?'purple':'amber'

  return (
    <>
      <style>{CSS}</style>
      <div onClick={goFS} style={{height:'100dvh',background:'#06050f',display:'flex',flexDirection:'column',fontFamily:"'Poppins',sans-serif",color:'#f0eeff',userSelect:'none',overflow:'hidden'}}>

        {/* Top bar */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px clamp(14px,3vw,28px)',borderBottom:'1px solid #2a2347',background:'#0d0b1a',flexShrink:0,gap:12,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:'clamp(20px,5vw,28px)',letterSpacing:4,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>FFC</div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'#6b6490',letterSpacing:2,lineHeight:1.5}}>ATTENDANCE<br/>KIOSK</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'clamp(12px,4vw,28px)',flexWrap:'wrap',justifyContent:'flex-end'}}>
            <LED color={ledCol}/>
            <Clock/>
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'clamp(12px,3vw,24px)',gap:'clamp(14px,3vw,20px)',overflow:'hidden'}}>

          {/* Camera box */}
          <div style={{position:'relative',width:'100%',maxWidth:480,aspectRatio:'4/3',borderRadius:20,overflow:'hidden',background:'#000',border:`3px solid ${borderCol}`,boxShadow:`0 0 36px 6px ${glowCol}`,transition:'border-color .3s,box-shadow .3s',flexShrink:0}}>
            <video ref={videoRef} playsInline muted autoPlay style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
            <canvas ref={canvasRef} style={{display:'none'}}/>

            {!result && camState==='running' && <div className="k-scan-line"/>}
            {!result && camState==='running' && <Corners/>}
            <ResultOverlay result={result} countdown={countdown}/>

            {camState==='starting'&&!result&&(
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.92)',gap:14}}>
                <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,0.15)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                <p style={{color:'#6b6490',fontSize:14,letterSpacing:1}}>Starting camera…</p>
              </div>
            )}
            {camState==='denied'&&!result&&(
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.96)',gap:10,padding:24,textAlign:'center'}}>
                <div style={{fontSize:44}}>🚫</div>
                <p style={{color:'#ef4444',fontWeight:700,fontSize:15}}>Camera Access Denied</p>
                <p style={{color:'#6b6490',fontSize:13,lineHeight:1.7}}>Tap the 🔒 icon in the address bar → Allow Camera → Refresh page</p>
              </div>
            )}
            {camState==='error'&&!result&&(
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(6,5,15,0.96)',gap:10,padding:24,textAlign:'center'}}>
                <div style={{fontSize:44}}>⚠️</div>
                <p style={{color:'#f59e0b',fontWeight:700,fontSize:15}}>Camera Error</p>
                <p style={{color:'#6b6490',fontSize:12,lineHeight:1.7,marginBottom:8}}>{debugMsg||'Could not start camera.'}</p>
                <button onClick={e=>{e.stopPropagation();window.location.reload()}} style={{background:'#7c3aed',border:'none',color:'#fff',borderRadius:8,padding:'10px 20px',fontSize:13,cursor:'pointer',fontWeight:600}}>🔄 Refresh Page</button>
              </div>
            )}
          </div>

          {!result&&(
            <p style={{fontSize:'clamp(14px,3.2vw,19px)',color:camState==='running'?'#9d8ec7':'#4a4460',textAlign:'center',lineHeight:1.6}}>
              {camState==='running'?'📲 Hold your QR code steady in front of the camera':camState==='starting'?'⏳ Initializing…':''}
            </p>
          )}

          {/* Stats */}
          <div style={{display:'flex',gap:'clamp(16px,5vw,40px)',background:'#0d0b1a',border:'1px solid #2a2347',borderRadius:16,padding:'clamp(12px,3vw,18px) clamp(18px,5vw,40px)',flexWrap:'wrap',justifyContent:'center',width:'100%',maxWidth:480}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:'clamp(26px,6vw,40px)',color:'#7c3aed',letterSpacing:2}}>{todayCount}</div>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'#6b6490',textTransform:'uppercase',letterSpacing:1}}>Today</div>
            </div>
            <div style={{width:1,background:'#2a2347',alignSelf:'stretch'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:'clamp(26px,6vw,40px)',color:'#22c55e',letterSpacing:2}}>{sessionCount}</div>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'#6b6490',textTransform:'uppercase',letterSpacing:1}}>Session</div>
            </div>
            {lastMember&&<>
              <div style={{width:1,background:'#2a2347',alignSelf:'stretch'}}/>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'clamp(12px,3vw,15px)',fontWeight:700,color:'#f0eeff'}}>{lastMember.name}</div>
                <div style={{fontSize:'clamp(9px,2vw,11px)',color:'#6b6490'}}>Last · {lastMember.time}</div>
              </div>
            </>}
          </div>
        </div>

        {/* Bottom */}
        <div style={{padding:'8px clamp(14px,3vw,28px)',borderTop:'1px solid #2a2347',background:'#0d0b1a',display:'flex',justifyContent:'space-between',fontSize:10,color:'#2e2a4a',flexShrink:0,flexWrap:'wrap',gap:6}}>
          <span>Friends Fitness Club · RT Complex, Wardhaman Nagar, Nagpur</span>
          <span>Tap for fullscreen · 24/7 Auto Kiosk</span>
        </div>
      </div>
    </>
  )
}
