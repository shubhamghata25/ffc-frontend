import React, { useEffect, useState, useRef } from 'react'
import { openRazorpay, openPhonePeUPI } from '../hooks/usePayment.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'

const API = import.meta.env.VITE_API_URL || 'https://ffc-backend-50cu.onrender.com'
const PH  = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400'

/* ── Cart ── */
function useCart() {
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('ffc_cart')||'[]')}catch{return []}})
  const persist=(c)=>{setCart(c);localStorage.setItem('ffc_cart',JSON.stringify(c))}
  const add=(p)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id)
      const next=ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}]
      localStorage.setItem('ffc_cart',JSON.stringify(next))
      return next
    })
  }
  const remove=(id)=>persist(cart.filter(i=>i.id!==id))
  const clear=()=>persist([])
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const count=cart.reduce((s,i)=>s+i.qty,0)
  return{cart,add,remove,clear,total,count}
}

export default function Store() {
  const [storeData,setStoreData]=useState({categories:[],subcategories:[],products:[]})
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState('categories')
  const [activeCat,setActiveCat]=useState(null)
  const [activeSub,setActiveSub]=useState(null)
  const [search,setSearch]=useState('')
  const [showCart,setShowCart]=useState(false)
  const [paying,setPaying]=useState(null)
  const [flashAdd,setFlashAdd]=useState(null)
  const cartRef=useRef(null)
  const {cart,add,remove,clear,total,count}=useCart()
  const {toasts,success,error,info}=useToast()

  useEffect(()=>{
    fetch(`${API}/api/store`).then(r=>r.json())
      .then(d=>{setStoreData(d);setLoading(false)}).catch(()=>setLoading(false))
  },[])

  /* close cart when clicking outside */
  useEffect(()=>{
    const fn=(e)=>{ if(cartRef.current&&!cartRef.current.contains(e.target))setShowCart(false) }
    document.addEventListener('mousedown',fn)
    return()=>document.removeEventListener('mousedown',fn)
  },[])

  const subsForCat = activeCat ? storeData.subcategories.filter(s=>s.categoryId===activeCat.id) : []
  const prodsForSub= activeSub ? storeData.products.filter(p=>p.subcategoryId===activeSub.id) : []
  const displayed  = search ? prodsForSub.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())) : prodsForSub

  const selectCat=(c)=>{ setActiveCat(c); setActiveSub(null); setSearch(''); setView('subcategories') }
  const selectSub=(s)=>{ setActiveSub(s); setSearch(''); setView('products') }
  const goBack=()=>{
    if(view==='products')          { setView('subcategories'); setActiveSub(null) }
    else if(view==='subcategories'){ setView('categories');    setActiveCat(null) }
  }

  function handleAddCart(p){
    add(p); setFlashAdd(p.id); setTimeout(()=>setFlashAdd(null),1400)
    info(`${p.name} added to cart`)
  }

  /* Which product to show payment modal for */
  const [payProduct, setPayProduct] = useState(null)

  async function handleBuyNow(product){
    setPayProduct(product)
  }

  // Customer detail state for store checkout
  const [storeCustomer, setStoreCustomer] = useState({ name:'', email:'', phone:'', address:'' })
  const [showCustomerForm, setShowCustomerForm] = useState(null) // 'product'|'cart'
  const [pendingProduct, setPendingProduct] = useState(null)
  const [gymPurchaseLoading, setGymPurchaseLoading] = useState(false)
  const setC = (k,v) => setStoreCustomer(f=>({...f,[k]:v}))
  const customerValid = storeCustomer.name.trim().length>1 && storeCustomer.phone.replace(/\D/g,'').length>=10 && storeCustomer.address.trim().length>5

  async function doRazorpay(product, customer){
    setPayProduct(null); setPaying(product.id)
    const basePrice    = product.price
    const chargedPrice = Math.ceil(basePrice * 1.02)  // +2% processing fee
    info(`Opening payment for ${product.name}…`)
    await openRazorpay({
      amount:      chargedPrice,
      name:        product.name,
      description: `${product.name} — Rs.${chargedPrice} (incl. 2% fee)`,
      prefill:     { name:customer.name, email:customer.email, contact:customer.phone },
      meta: {
        type:'store_product', itemId:product.id, itemName:product.name,
        customerName:customer.name, customerEmail:customer.email, customerPhone:customer.phone,
        productName:product.name, productPrice:chargedPrice,
      },
      onSuccess: ()=>{ success(`Order confirmed! Check your email for details.`); setPaying(null) },
      onFailure: (msg)=>{ if(!msg.includes('cancelled')) error(msg); setPaying(null) },
    })
    setPaying(null)
  }

  function doUPI(product, customer){
    setPayProduct(null)
    info(/Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Opening UPI app…' : 'UPI best on mobile — trying…')
    openPhonePeUPI({
      amount: product.price,
      name:   product.name,
      onSuccess: ()=> success('UPI payment initiated! Share screenshot at the gym to confirm.'),
      onFailure: (msg)=> error(msg),
    })
  }

  async function doGymPurchase(product, customer) {
    setGymPurchaseLoading(true)
    try {
      const isCart = !product
      const payload = {
        type: 'gym_purchase',
        customerName:  customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || '',
        address:       customer.address || '',
      }
      if (isCart) {
        payload.items       = cart.map(i=>({id:i.id, name:i.name, qty:i.qty, price:i.price}))
        payload.totalAmount = cart.reduce((s,i)=>s+i.price*i.qty, 0)
        payload.description = cart.map(i=>`${i.name} x${i.qty}`).join(', ')
      } else {
        payload.productName  = product.name
        payload.productPrice = product.price
        payload.itemId       = product.id
      }
      const res = await fetch(`${API}/api/store/gym-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Server error')
      success(`Order noted! Show this to the gym counter to pay. Name: ${customer.name}`)
      if (isCart) clear()
    } catch(e) {
      error('Could not place gym order. Please try again or contact the gym.')
    }
    setGymPurchaseLoading(false)
  }

  async function handleCartCheckout(customer){
    if(cart.length===0) return
    const totalAmt   = cart.reduce((s,i)=>s+i.price*i.qty,0)
    const chargedAmt = Math.ceil(totalAmt * 1.02)  // +2% processing fee
    const desc = cart.map(i=>`${i.name} x${i.qty}`).join(', ')
    setShowCart(false); setPaying('cart')
    info('Opening payment for cart…')
    await openRazorpay({
      amount: chargedAmt,
      name: 'FFC Store Order',
      description: `${desc} — Rs.${chargedAmt} (incl. 2% fee)`,
      prefill: { name:customer.name, email:customer.email, contact:customer.phone },
      meta: {
        type:'store_cart',
        customerName:customer.name, customerEmail:customer.email, customerPhone:customer.phone,
        items: cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),
        totalAmount:chargedAmt, description:desc,
      },
      onSuccess: ()=>{
        success(`Order placed! Check your email for confirmation.`)
        clear(); setPaying(null)
      },
      onFailure: (msg)=>{ if(!msg.includes('cancelled')) error(msg); setPaying(null) },
    })
    setPaying(null)
  }

  const crumb=[]
  if(activeCat) crumb.push({label:activeCat.name,action:()=>{setView('subcategories');setActiveSub(null)}})
  if(activeSub) crumb.push({label:activeSub.name,action:null})

  return (
    <div className="page-wrapper">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .s-card{background:linear-gradient(145deg,#130f24,#1a1535);border-radius:20px;border:1px solid rgba(124,58,237,0.15);overflow:hidden;transition:transform .25s,box-shadow .25s,border-color .25s;cursor:pointer}
        .s-card:hover{transform:translateY(-6px);box-shadow:0 14px 40px rgba(124,58,237,0.22);border-color:rgba(124,58,237,0.35)}
        .s-card-static{background:linear-gradient(145deg,#130f24,#1a1535);border-radius:20px;border:1px solid rgba(124,58,237,0.15);overflow:hidden;animation:fadeIn .35s ease both}
        .pay-btn{border:none;border-radius:30px;font-family:'Poppins',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;padding:11px 0;width:100%}
        .pay-btn-primary{background:linear-gradient(135deg,#7c3aed,#9c59f7);color:#fff;box-shadow:0 4px 16px rgba(124,58,237,0.35)}
        .pay-btn-primary:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .pay-btn-ghost{background:transparent;border:1px solid rgba(124,58,237,0.4);color:#bb86fc}
        .pay-btn-ghost:hover{background:rgba(124,58,237,0.12)}
        .pay-btn-success{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff}
        @media(max-width:640px){.s-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}}
      `}</style>

      <section className="section">
        {/* ─── Header ─── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:36,flexWrap:'wrap',gap:16}}>
          <div>
            <div className="accent-line"/>
            <h1 className="section-title" style={{marginBottom:6}}>
              Our <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Store</span>
            </h1>
            {crumb.length>0 && (
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--muted)'}}>
                <span onClick={()=>{setView('categories');setActiveCat(null);setActiveSub(null)}} style={{cursor:'pointer',color:'#9c59f7'}}>Store</span>
                {crumb.map((c,i)=>(
                  <React.Fragment key={i}>
                    <span>›</span>
                    <span onClick={c.action||undefined} style={{color:i===crumb.length-1?'var(--textSub)':'#9c59f7',cursor:c.action?'pointer':'default'}}>{c.label}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Cart button */}
          <div ref={cartRef} style={{position:'relative'}}>
            <button onClick={()=>setShowCart(s=>!s)} style={{
              display:'flex',alignItems:'center',gap:8,
              background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',
              color:'#bb86fc',borderRadius:30,padding:'10px 20px',fontWeight:600,fontSize:14,cursor:'pointer',
              transition:'all .2s',
            }}>
              🛒 Cart
              {count>0 && <span style={{background:'linear-gradient(135deg,#7c3aed,#9c59f7)',color:'#fff',borderRadius:20,padding:'1px 9px',fontSize:12}}>{count}</span>}
            </button>

            {/* Cart dropdown */}
            {showCart && (
              <div style={{position:'absolute',top:'calc(100%+10px)',right:0,width:330,
                background:'linear-gradient(145deg,#130f24,#1a1535)',border:'1px solid rgba(124,58,237,0.25)',
                borderRadius:20,padding:22,zIndex:300,boxShadow:'0 12px 48px rgba(0,0,0,0.7)'}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:'#bb86fc'}}>🛒 Your Cart</div>
                {cart.length===0
                  ? <p style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'18px 0'}}>Cart is empty</p>
                  : <>
                    {cart.map(item=>(
                      <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(124,58,237,0.1)'}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{item.name}</div>
                          <div style={{fontSize:12,color:'var(--muted)'}}>₹{item.price} × {item.qty}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{color:'#9c59f7',fontWeight:700,fontSize:14}}>₹{item.price*item.qty}</span>
                          <button onClick={()=>remove(item.id)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
                        </div>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,margin:'14px 0 16px',color:'var(--text)'}}>
                      <span>Total</span>
                      <span style={{background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',fontSize:18}}>₹{total.toLocaleString()}</span>
                    </div>
                    <button className="pay-btn pay-btn-primary" onClick={()=>{ setShowCustomerForm('cart'); setShowCart(false) }} disabled={paying==='cart'}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      {paying==='cart'
                        ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/> Processing…</>
                        : '🔒 Checkout'
                      }
                    </button>
                  </>
                }
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div style={{textAlign:'center',padding:80}}>
            <div style={{width:44,height:44,border:'3px solid rgba(124,58,237,0.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px'}}/>
            <p style={{color:'var(--muted)'}}>Loading store…</p>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {!loading&&view==='categories'&&(
          <div className="s-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:'clamp(12px,2vw,22px)',maxWidth:1100,margin:'0 auto'}}>
            {storeData.categories.map(cat=>(
              <div key={cat.id} className="s-card" onClick={()=>selectCat(cat)}>
                <img src={cat.image||PH} alt={cat.name} style={{width:'100%',height:'clamp(140px,26vw,220px)',objectFit:'cover',objectPosition:'center',display:'block'}}/>
                <div style={{padding:'18px 22px',textAlign:'center'}}>
                  <h3 style={{color:'#bb86fc',fontSize:19,marginBottom:4}}>{cat.name}</h3>
                  <p style={{color:'var(--muted)',fontSize:12}}>{storeData.products.filter(p=>p.categoryId===cat.id&&p.inStock).length} products</p>
                </div>
              </div>
            ))}
            {storeData.categories.length===0&&<p style={{color:'var(--muted)',textAlign:'center',gridColumn:'1/-1',padding:40}}>No categories yet.</p>}
          </div>
        )}

        {/* ── SUBCATEGORIES ── */}
        {!loading&&view==='subcategories'&&(
          <>
            <button onClick={goBack} style={{background:'none',border:'none',color:'#9c59f7',cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8,marginBottom:28}}>← Back</button>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,marginBottom:22}}>{activeCat?.name}</h2>
            <div className="s-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))',gap:'clamp(10px,2vw,18px)',maxWidth:1100,margin:'0 auto'}}>
              {subsForCat.map(sub=>(
                <div key={sub.id} className="s-card" onClick={()=>selectSub(sub)}>
                  <img src={sub.image||PH} alt={sub.name} style={{width:'100%',height:'clamp(120px,22vw,170px)',objectFit:'cover',objectPosition:'center',display:'block'}}/>
                  <div style={{padding:'14px 18px',textAlign:'center'}}>
                    <h3 style={{color:'#bb86fc',fontSize:16}}>{sub.name}</h3>
                    <p style={{color:'var(--muted)',fontSize:12,marginTop:4}}>{storeData.products.filter(p=>p.subcategoryId===sub.id&&p.inStock).length} items</p>
                  </div>
                </div>
              ))}
              {subsForCat.length===0&&<p style={{color:'var(--muted)',gridColumn:'1/-1',textAlign:'center',padding:40}}>No subcategories.</p>}
            </div>
          </>
        )}

        {/* ── PRODUCTS ── */}
        {!loading&&view==='products'&&(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
              <button onClick={goBack} style={{background:'none',border:'none',color:'#9c59f7',cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>← Back</button>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,flex:1,textAlign:'center'}}>{activeSub?.name}</h2>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…"
                style={{padding:'9px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:10,color:'var(--text)',fontFamily:'Poppins,sans-serif',fontSize:13,outline:'none',width:200}}/>
            </div>

            <div className="s-grid prod-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,220px),1fr))',gap:'clamp(12px,2vw,22px)',maxWidth:1100,margin:'0 auto'}}>
              {displayed.map((p,idx)=>(
                <div key={p.id} className="s-card-static" style={{animationDelay:`${idx*0.04}s`}}>
                  <div style={{position:'relative'}}>
                    <img src={p.image||PH} alt={p.name} style={{width:'100%',height:'clamp(160px,35vw,240px)',objectFit:'cover',objectPosition:'center top',display:'block'}}/>
                    {!p.inStock&&(
                      <div style={{position:'absolute',inset:0,background:'rgba(6,5,15,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{color:'rgba(240,238,255,0.6)',fontWeight:700,fontSize:14}}>Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div style={{padding:18}}>
                    <h3 style={{fontSize:16,fontWeight:700,marginBottom:5}}>{p.name}</h3>
                    {p.description&&<p style={{color:'var(--textSub)',fontSize:13,lineHeight:1.6,marginBottom:10}}>{p.description}</p>}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>₹{p.price.toLocaleString()}</span>
                      {p.inStock&&<span style={{color:'#4ade80',fontSize:12,fontWeight:600}}>● In Stock</span>}
                    </div>
                    {p.inStock&&(
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <button className={`pay-btn ${paying===p.id?'pay-btn-success':'pay-btn-primary'}`}
                          onClick={()=>handleBuyNow(p)} disabled={!!paying}>
                          {paying===p.id
                            ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:13,height:13,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/> Processing…</span>
                            : '🛍️ Buy Now'
                          }
                        </button>
                        <button className={`pay-btn pay-btn-ghost ${flashAdd===p.id?'pay-btn-success':''}`}
                          onClick={()=>handleAddCart(p)}>
                          {flashAdd===p.id ? '✓ Added!' : '🛒 Add to Cart'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {displayed.length===0&&<p style={{color:'var(--muted)',gridColumn:'1/-1',textAlign:'center',padding:60}}>No products found.</p>}
            </div>
          </>
        )}
      </section>

      {/* ── STEP 1: Customer Details Modal (product or cart) ── */}
      {(payProduct || showCustomerForm) && (() => {
        const isCart   = showCustomerForm === 'cart'
        const title    = isCart ? 'Cart Checkout' : payProduct?.name
        const subprice = isCart ? `Rs.${total.toLocaleString()}` : `Rs.${payProduct?.price?.toLocaleString()}`
        const inpS     = {width:'100%',padding:'11px 13px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:10,color:'#f0eeff',fontFamily:"'Poppins',sans-serif",fontSize:14,outline:'none',boxSizing:'border-box'}
        const close    = () => { setPayProduct(null); setShowCustomerForm(null) }
        return (
          <div onClick={close} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(145deg,#130f24,#1a1535)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'20px 20px 0 0',padding:'clamp(20px,4vw,28px)',width:'100%',maxWidth:460,maxHeight:'92vh',overflowY:'auto'}}>
              <div style={{width:40,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 16px'}}/>
              {/* Summary */}
              <div style={{textAlign:'center',marginBottom:18}}>
                <div style={{fontSize:11,color:'#9c59f7',fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Your Details</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{title}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,background:'linear-gradient(135deg,#bb86fc,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{subprice}</div>
              </div>
              {/* Fields */}
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:11,color:'#6b6490',display:'block',marginBottom:4}}>Full Name *</label>
                  <input value={storeCustomer.name} onChange={e=>setC('name',e.target.value)} placeholder="Rahul Sharma" style={inpS}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#6b6490',display:'block',marginBottom:4}}>Phone Number *</label>
                  <input value={storeCustomer.phone} onChange={e=>setC('phone',e.target.value)} placeholder="10-digit mobile" type="tel" style={inpS}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#6b6490',display:'block',marginBottom:4}}>Email (for order confirmation)</label>
                  <input value={storeCustomer.email} onChange={e=>setC('email',e.target.value)} placeholder="your@email.com" type="email" style={inpS}/>
                  <p style={{fontSize:11,color:'#7c3aed',marginTop:5}}>📧 Order confirmation will be sent to this email</p>
                </div>
                <div>
                  <label style={{fontSize:11,color:'#6b6490',display:'block',marginBottom:4}}>Delivery Address *</label>
                  <input value={storeCustomer.address} onChange={e=>setC('address',e.target.value)} placeholder="House No, Street, Area, City" style={inpS}/>
                </div>
              </div>
              {/* Payment buttons */}
              {customerValid ? (
                <div style={{display:'flex',flexDirection:'column',gap:9}}>
                  <button onClick={()=>{ isCart ? handleCartCheckout(storeCustomer) : doRazorpay(payProduct, storeCustomer); close() }}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:'rgba(124,58,237,0.12)',border:'1.5px solid rgba(124,58,237,0.35)',borderRadius:12,cursor:'pointer',color:'#f0eeff',fontSize:14,fontWeight:600,fontFamily:"'Poppins',sans-serif",width:'100%'}}>
                    <span style={{fontSize:20}}>💳</span>
                    <div style={{textAlign:'left'}}>
                      <div>Card / Net Banking / UPI</div>
                      <div style={{fontSize:11,color:'#9c59f7',fontWeight:400}}>Razorpay — GPay, PhonePe, all banks · <span style={{color:'#f59e0b'}}>+2% processing fee</span></div>
                    </div>
                    <span style={{marginLeft:'auto',color:'#9c59f7'}}>›</span>
                  </button>
                  {!isCart && (
                    <button onClick={()=>{ doUPI(payProduct, storeCustomer); close() }}
                      style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:'rgba(99,102,241,0.08)',border:'1.5px solid rgba(99,102,241,0.25)',borderRadius:12,cursor:'pointer',color:'#f0eeff',fontSize:14,fontWeight:600,fontFamily:"'Poppins',sans-serif",width:'100%'}}>
                      <span style={{fontSize:20}}>📱</span>
                      <div style={{textAlign:'left'}}><div>UPI / PhonePe Direct</div><div style={{fontSize:11,color:'#818cf8',fontWeight:400}}>Opens UPI app on mobile</div></div>
                      <span style={{marginLeft:'auto',color:'#818cf8'}}>›</span>
                    </button>
                  )}
                  <button
                    onClick={()=>{ doGymPurchase(isCart ? null : payProduct, storeCustomer); close() }}
                    disabled={gymPurchaseLoading}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:'rgba(245,158,11,0.08)',border:'1.5px solid rgba(245,158,11,0.3)',borderRadius:12,cursor:'pointer',color:'#f0eeff',fontSize:14,fontWeight:600,fontFamily:"'Poppins',sans-serif",width:'100%',opacity:gymPurchaseLoading?0.6:1}}>
                    <span style={{fontSize:20}}>🏋</span>
                    <div style={{textAlign:'left'}}>
                      <div>Buy at Gym Counter</div>
                      <div style={{fontSize:11,color:'#f59e0b',fontWeight:400}}>Pay cash / UPI directly at FFC · No online fee</div>
                    </div>
                    <span style={{marginLeft:'auto',color:'#f59e0b'}}>›</span>
                  </button>
                </div>
              ) : (
                <p style={{textAlign:'center',fontSize:12,color:'#6b6490',padding:'8px 0'}}>Please fill your name, phone and address to continue</p>
              )}
              <button onClick={close} style={{width:'100%',marginTop:12,padding:'10px',background:'rgba(255,255,255,0.04)',border:'none',borderRadius:10,color:'#6b6490',cursor:'pointer',fontFamily:"'Poppins',sans-serif",fontSize:13}}>Cancel</button>
            </div>
          </div>
        )
      })()}
      <ToastContainer toasts={toasts}/>
    </div>
  )
}
