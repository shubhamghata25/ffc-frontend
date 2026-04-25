import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function useCounter(target, duration=1800, trigger) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start=0
    const step=Math.ceil(target/(duration/16))
    const t=setInterval(()=>{ start=Math.min(start+step,target); setVal(start); if(start>=target)clearInterval(t) },16)
    return ()=>clearInterval(t)
  }, [trigger,target,duration])
  return val
}

function useInView(threshold=0.3) {
  const ref=useRef(null); const [v,setV]=useState(false)
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting)setV(true) },{threshold})
    if(ref.current)obs.observe(ref.current)
    return()=>obs.disconnect()
  },[threshold])
  return [ref,v]
}

const TESTIMONIALS=[
  {text:'Best gym in Nagpur! My transformation in 3 months was unbelievable.',name:'Rahul S.',rating:5},
  {text:'Trainer Nagendra is world-class. Lost 12 kg in 4 months!',name:'Priya Y.',rating:5},
  {text:'Affordable pricing with premium equipment. Totally worth it.',name:'Amit K.',rating:5},
]
const FEATURES=[
  {icon:'🏋',title:'Modern Equipment',desc:'International standard machines and free weights for complete body training.'},
  {icon:'🎯',title:'Certified Trainers',desc:'Professional trainers with years of experience in body transformation.'},
  {icon:'🥗',title:'Diet Planning',desc:'Customised nutrition plans tailored specifically to your fitness goals.'},
  {icon:'📈',title:'Proven Results',desc:'200+ members transformed with our scientifically-backed programs.'},
]

export default function Home() {
  const [countersRef,countersVisible]=useInView()
  const members =useCounter(200,1600,countersVisible)
  const trainers=useCounter(5,1000,countersVisible)
  const years   =useCounter(3,1000,countersVisible)
  const [tIdx,setTIdx]=useState(0)
  useEffect(()=>{ const t=setInterval(()=>setTIdx(i=>(i+1)%TESTIMONIALS.length),3400); return()=>clearInterval(t) },[])
  const [offer,setOffer]=useState(null)
  useEffect(()=>{
    const api=import.meta.env.VITE_API_URL; if(!api)return
    fetch(`${api}/api/offer`).then(r=>r.json()).then(d=>{if(d&&d.status==='ON')setOffer(d)}).catch(()=>{})
  },[])

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 24px rgba(156,89,247,.7)}50%{text-shadow:0 0 52px rgba(156,89,247,1)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .fade-hero{animation:fadeUp .8s ease both}
        .star{color:#f59e0b;font-size:14px}
        .feat-card{transition:transform .3s,box-shadow .3s}
        .feat-card:hover{transform:translateY(-8px);box-shadow:0 16px 48px rgba(124,58,237,0.25)!important}

        /* ── Hero video: full cover on all devices ── */
        .hero-video{
          position:absolute;
          top:50%;
          left:50%;
          /* Centre then scale to cover — works on every browser */
          transform:translate(-50%,-50%);
          -webkit-transform:translate(-50%,-50%);
          /* At minimum fill the container in both axes */
          min-width:100%;
          min-height:100%;
          /* Natural sizing — browser picks the axis that needs to grow */
          width:auto;
          height:auto;
          object-fit:cover;
          object-position:center center;
          z-index:1;
          /* GPU layer — stops iOS Safari from compositing badly */
          -webkit-backface-visibility:hidden;
          backface-visibility:hidden;
          will-change:transform;
        }
        /* iOS Safari @supports override — translate trick breaks there */
        @supports (-webkit-touch-callout:none){
          .hero-video{
            top:0; left:0;
            width:100%;
            height:100%;
            min-width:unset; min-height:unset;
            transform:none;
            -webkit-transform:none;
          }
        }

        /* ── Counter row: mobile ── */
        @media(max-width:600px){
          .counter-row{ gap:28px!important; }
          .counter-num{ font-size:52px!important; }
          .counter-label{ font-size:11px!important; }
        }

        /* ── Feature cards: single column on small screens ── */
        @media(max-width:500px){
          .feat-grid{ grid-template-columns:1fr!important; gap:14px!important; }
        }

        /* ── Testimonial: tighter padding on mobile ── */
        @media(max-width:480px){
          .testi-box{ padding:24px 18px!important; }
          .testi-text{ font-size:15px!important; }
        }

        /* ── Hero text: prevent overflow on very small screens ── */
        @media(max-width:360px){
          .hero-tag{ font-size:10px!important; padding:5px 12px!important; letter-spacing:1!important; }
          .hero-sub{ font-size:13px!important; }
        }
      `}</style>

      {/* ─── HERO ─── */}
      <section style={{position:'relative',height:'100vh',minHeight:'100svh',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {/* video — class hero-video fixes mobile sizing */}
        <video autoPlay muted loop playsInline className="hero-video" poster="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1400&q=80">
          <source src="/gym-video.mp4" type="video/mp4"/>
        </video>

        {/* overlay */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(6,5,15,0.88) 0%,rgba(44,16,101,0.78) 50%,rgba(6,5,15,0.88) 100%)',zIndex:2}}/>

        {/* glow — smaller on mobile */}
        <div style={{position:'absolute',top:'15%',left:'50%',transform:'translateX(-50%)',width:'min(600px,90vw)',height:'min(600px,90vw)',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)',zIndex:2,pointerEvents:'none'}}/>

        <div className="fade-hero" style={{position:'relative',zIndex:3,textAlign:'center',padding:'0 20px',width:'100%',maxWidth:800}}>
          <div className="hero-tag" style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.35)',borderRadius:30,padding:'6px 16px',fontSize:11,fontWeight:700,letterSpacing:2,color:'#bb86fc',marginBottom:18,textTransform:'uppercase'}}>
            🏋 Nagpur's #1 Fitness Club — Est. 2023
          </div>

          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(38px,9vw,100px)',letterSpacing:'clamp(2px,1vw,4px)',lineHeight:1.05,marginBottom:18,animation:'glow 3s ease-in-out infinite'}}>
            Push Harder<br/>
            <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              Than Yesterday
            </span>
          </h1>

          <p className="hero-sub" style={{color:'rgba(240,238,255,0.75)',fontSize:'clamp(13px,2.2vw,17px)',lineHeight:1.7,maxWidth:500,margin:'0 auto 28px'}}>
            Transform your body with expert trainers, modern equipment &amp; personalised diet plans — all under one roof in Nagpur.
          </p>

          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <Link to="/pricing" className="btn" style={{fontSize:'clamp(13px,2vw,15px)',padding:'11px 26px'}}>Join Now →</Link>
            <Link to="/about"   className="btn btn-ghost" style={{fontSize:'clamp(13px,2vw,15px)',padding:'11px 26px'}}>Learn More</Link>
          </div>
        </div>

        <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:3,textAlign:'center'}}>
          <div style={{width:2,height:36,background:'linear-gradient(#7c3aed,transparent)',margin:'0 auto'}}/>
          <p style={{color:'rgba(107,100,144,0.8)',fontSize:9,marginTop:6,letterSpacing:3}}>SCROLL</p>
        </div>
      </section>

      {/* ─── COUNTERS ─── */}
      <section ref={countersRef} style={{background:'rgba(13,11,26,0.95)',padding:'clamp(40px,8vw,72px) 8%',borderBottom:'1px solid rgba(124,58,237,0.12)',position:'relative'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.1) 0%,transparent 60%)',pointerEvents:'none'}}/>
        <div className="counter-row" style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:48,position:'relative'}}>
          {[
            {val:members, label:'Active Members',     suffix:'+'},
            {val:trainers,label:'Expert Trainers',    suffix:''},
            {val:years,   label:'Years of Excellence',suffix:'+'},
          ].map(c=>(
            <div key={c.label} style={{textAlign:'center',minWidth:100}}>
              <div className="counter-num" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(48px,10vw,70px)',lineHeight:1,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                {c.val}{c.suffix}
              </div>
              <p className="counter-label" style={{color:'rgba(184,176,212,0.6)',fontSize:'clamp(10px,1.5vw,13px)',letterSpacing:1,marginTop:6,textTransform:'uppercase'}}>{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── OFFER BANNER ─── */}
      {offer && (
        <section style={{borderBottom:'1px solid rgba(124,58,237,0.2)',position:'relative',overflow:'hidden'}}>
          {offer.poster
            ? <div style={{position:'relative'}}>
                <img src={offer.poster} alt={offer.title} style={{width:'100%',height:'clamp(240px,55vw,520px)',objectFit:'cover',objectPosition:'center',display:'block'}}/>
                <div style={{position:'absolute',inset:0,background:'rgba(6,5,15,0.62)'}}/>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px 6%',textAlign:'center'}}>
                  <div className="badge-purple" style={{marginBottom:12,fontSize:11,letterSpacing:2}}>LIMITED TIME OFFER</div>
                  <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(24px,6vw,60px)',letterSpacing:2,marginBottom:10}}>{offer.title}</h2>
                  <p style={{color:'rgba(240,238,255,0.82)',marginBottom:22,fontSize:'clamp(13px,2vw,16px)',lineHeight:1.6,maxWidth:480}}>{offer.description}</p>
                  <a href={offer.link} className="btn" style={{fontSize:'clamp(13px,2vw,15px)'}}>{offer.btn}</a>
                </div>
              </div>
            : <div style={{background:'linear-gradient(135deg,#0d0b1a,#1a0a3e)',padding:'clamp(32px,6vw,52px) 8%',textAlign:'center'}}>
                <div className="badge-purple" style={{marginBottom:12}}>LIMITED TIME OFFER</div>
                <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(24px,5vw,52px)',letterSpacing:2,marginBottom:10}}>{offer.title}</h2>
                <p style={{color:'rgba(240,238,255,0.8)',marginBottom:22,fontSize:'clamp(13px,2vw,16px)',lineHeight:1.6}}>{offer.description}</p>
                <a href={offer.link} className="btn">{offer.btn}</a>
              </div>
          }
        </section>
      )}

      {/* ─── WHY CHOOSE US ─── */}
      <section className="section" style={{background:'var(--bg)',textAlign:'center'}}>
        <div className="accent-line"/>
        <h2 className="section-title">Why Choose <span>Us</span></h2>
        <p className="section-sub" style={{margin:'0 auto 40px',fontSize:'clamp(14px,2vw,16px)'}}>We combine cutting-edge equipment with personalised coaching to deliver real, visible results.</p>
        <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:18,maxWidth:1100,margin:'0 auto'}}>
          {FEATURES.map(f=>(
            <div key={f.title} className="feat-card card-glass" style={{padding:'clamp(20px,3vw,32px) clamp(16px,2.5vw,26px)',textAlign:'center',borderRadius:20}}>
              <div style={{width:54,height:54,borderRadius:'50%',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 14px',animation:'float 3s ease-in-out infinite'}}>
                {f.icon}
              </div>
              <h3 style={{color:'#bb86fc',marginBottom:8,fontSize:'clamp(15px,2vw,17px)',fontWeight:700}}>{f.title}</h3>
              <p style={{color:'var(--textSub)',fontSize:'clamp(12px,1.5vw,14px)',lineHeight:1.7}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{background:'rgba(13,11,26,0.8)',padding:'clamp(48px,8vw,80px) 6%',textAlign:'center',borderTop:'1px solid rgba(124,58,237,0.1)'}}>
        <div className="accent-line"/>
        <h2 className="section-title" style={{marginBottom:30}}>Member <span>Stories</span></h2>
        <div className="testi-box" style={{maxWidth:580,margin:'0 auto',background:'linear-gradient(145deg,rgba(19,15,36,0.9),rgba(26,21,53,0.9))',border:'1px solid rgba(124,58,237,0.25)',borderRadius:22,padding:'clamp(22px,4vw,40px) clamp(18px,4vw,36px)',backdropFilter:'blur(12px)'}}>
          <div style={{marginBottom:12}}>{'★'.repeat(TESTIMONIALS[tIdx].rating).split('').map((_,i)=><span key={i} className="star">★</span>)}</div>
          <p className="testi-text" style={{fontSize:'clamp(14px,2vw,18px)',lineHeight:1.8,color:'var(--text)',marginBottom:16}}>"{TESTIMONIALS[tIdx].text}"</p>
          <p style={{color:'#9c59f7',fontWeight:700,fontSize:'clamp(13px,1.8vw,15px)'}}>— {TESTIMONIALS[tIdx].name}</p>
          <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:18}}>
            {TESTIMONIALS.map((_,i)=>(
              <div key={i} onClick={()=>setTIdx(i)} style={{width:i===tIdx?22:8,height:8,borderRadius:4,background:i===tIdx?'#7c3aed':'rgba(124,58,237,0.25)',cursor:'pointer',transition:'all .3s'}}/>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SHOP PREVIEW ─── */}
      <section className="section" style={{background:'var(--bg)',textAlign:'center'}}>
        <div className="accent-line"/>
        <h2 className="section-title">Shop Our <span>Products</span></h2>
        <p className="section-sub" style={{margin:'0 auto 28px',fontSize:'clamp(13px,2vw,16px)'}}>Premium supplements, equipment &amp; accessories at the best prices.</p>
        <div style={{maxWidth:'min(640px,100%)',margin:'0 auto',borderRadius:20,overflow:'hidden',border:'1px solid rgba(124,58,237,0.2)',background:'var(--card)'}}>
          <img src="https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800" alt="Gym Supplements" style={{width:'100%',height:'clamp(200px,45vw,380px)',objectFit:'cover',objectPosition:'center',display:'block'}}/>
          <div style={{padding:'clamp(16px,3vw,28px)'}}>
            <Link to="/store" className="btn" style={{fontSize:'clamp(13px,2vw,15px)'}}>Shop Now →</Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{padding:'clamp(56px,10vw,90px) 6%',textAlign:'center',background:'linear-gradient(135deg,#0d0b1a,#1a0a3e,#0d0b1a)',borderTop:'1px solid rgba(124,58,237,0.15)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',width:'min(500px,90vw)',height:'min(500px,90vw)',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.14) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(32px,7vw,70px)',letterSpacing:'clamp(1px,1vw,3px)',marginBottom:12,position:'relative'}}>
          Ready to <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Transform?</span>
        </h2>
        <p style={{color:'var(--textSub)',fontSize:'clamp(13px,1.8vw,16px)',marginBottom:28,lineHeight:1.7,maxWidth:460,margin:'0 auto 28px',position:'relative'}}>
          Join 200+ members who already changed their lives at Friends Fitness Club, Nagpur.
        </p>
        <Link to="/pricing" className="btn" style={{fontSize:'clamp(13px,2vw,16px)',padding:'clamp(11px,2vw,14px) clamp(24px,4vw,42px)',position:'relative'}}>View Membership Plans</Link>
      </section>
    </>
  )
}
