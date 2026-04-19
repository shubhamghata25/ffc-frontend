import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/* ── Cart helpers ── */
function useCart() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ffc_cart') || '[]') } catch { return [] }
  })
  const save = (c) => { setCart(c); localStorage.setItem('ffc_cart', JSON.stringify(c)) }
  const addItem = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id)
      const next = exists
        ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...product, qty: 1 }]
      localStorage.setItem('ffc_cart', JSON.stringify(next))
      return next
    })
  }
  const removeItem = (id) => save(cart.filter(i => i.id !== id))
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  return { cart, addItem, removeItem, total }
}

/* ── Spinner ── */
const Spin = () => (
  <div style={{ width:44,height:44,border:'3px solid #222',borderTopColor:'#ff3c00',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px' }}/>
)

export default function Store() {
  const [storeData, setStoreData] = useState({ categories:[], subcategories:[], products:[] })
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('categories')   // categories | subcategories | products
  const [activeCat, setActiveCat] = useState(null)
  const [activeSub, setActiveSub] = useState(null)
  const [search, setSearch]       = useState('')
  const [showCart, setShowCart]   = useState(false)
  const [added, setAdded]         = useState(null)
  const { cart, addItem, removeItem, total } = useCart()

  useEffect(() => {
    fetch(`${API}/api/store`)
      .then(r => r.json())
      .then(d => { setStoreData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  /* derived */
  const subcatsForCat   = activeCat ? storeData.subcategories.filter(s => s.categoryId === activeCat.id) : []
  const productsForSub  = activeSub ? storeData.products.filter(p => p.subcategoryId === activeSub.id) : []
  const displayProducts = search ? productsForSub.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : productsForSub

  /* navigation */
  function selectCat(cat) { setActiveCat(cat); setActiveSub(null); setSearch(''); setView('subcategories') }
  function selectSub(sub) { setActiveSub(sub); setSearch(''); setView('products') }
  function goBack() {
    if (view === 'products')      { setView('subcategories'); setActiveSub(null) }
    else if (view === 'subcategories') { setView('categories'); setActiveCat(null) }
  }

  /* add to cart with flash */
  function handleAdd(p) {
    addItem(p)
    setAdded(p.id)
    setTimeout(() => setAdded(null), 1400)
  }

  function buyWhatsApp(name, price) {
    const msg = `Hello, I want to buy ${name} for ₹${price}`
    window.open(`https://wa.me/918484805154?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function checkoutWhatsApp() {
    const lines = cart.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')
    const msg   = `Hello! I want to order:\n${lines}\n\nTotal: ₹${total}`
    window.open(`https://wa.me/918484805154?text=${encodeURIComponent(msg)}`, '_blank')
  }

  /* breadcrumb */
  const crumb = []
  if (activeCat) crumb.push(activeCat.name)
  if (activeSub) crumb.push(activeSub.name)

  /* placeholder image */
  const ph = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400'

  return (
    <div className="page-wrapper">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .store-card{transition:transform .25s,box-shadow .25s;cursor:pointer}
        .store-card:hover{transform:translateY(-6px);box-shadow:0 0 28px rgba(255,60,0,0.22)}
        .add-btn{width:100%;padding:11px;border:none;border-radius:30px;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;font-family:'Poppins',sans-serif}
        .add-btn.primary{background:#ff3c00;color:#fff;box-shadow:0 0 14px rgba(255,60,0,0.35)}
        .add-btn.primary:hover{box-shadow:0 0 24px rgba(255,60,0,0.6);transform:translateY(-1px)}
        .add-btn.ghost{background:transparent;border:1px solid #ff3c00;color:#ff3c00}
        .add-btn.ghost:hover{background:#ff3c00;color:#fff}
        .add-btn.success{background:#22c55e;color:#fff}
        .cart-dot{position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#ff3c00;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
        @media(max-width:640px){
          .store-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}
          .store-grid-3{grid-template-columns:1fr!important}
        }
      `}</style>

      <section className="section">
        {/* ── Header row ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom:6 }}>Our Store</h1>
            {crumb.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#666' }}>
                <span onClick={() => { setView('categories'); setActiveCat(null); setActiveSub(null) }} style={{ cursor:'pointer', color:'#ff3c00' }}>Store</span>
                {crumb.map((c,i) => <React.Fragment key={i}><span>›</span><span style={{ color: i===crumb.length-1?'#ccc':'#ff3c00', cursor: i<crumb.length-1?'pointer':'default' }} onClick={()=>{ if(i===0){setView('subcategories');setActiveSub(null)} }}>{c}</span></React.Fragment>)}
              </div>
            )}
          </div>
          {/* Cart button */}
          <div style={{ position:'relative', display:'inline-block' }}>
            <button onClick={() => setShowCart(s => !s)} style={{ background:'rgba(255,60,0,0.12)', border:'1px solid rgba(255,60,0,0.3)', color:'#ff3c00', borderRadius:30, padding:'10px 20px', fontWeight:600, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              🛒 Cart
              {cart.length > 0 && <span style={{ background:'#ff3c00', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:12 }}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            </button>
            {/* Cart dropdown */}
            {showCart && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:320, background:'#181818', border:'1px solid #222', borderRadius:16, padding:20, zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>🛒 Your Cart</div>
                {cart.length === 0
                  ? <p style={{ color:'#555', fontSize:13, textAlign:'center', padding:'20px 0' }}>Cart is empty</p>
                  : <>
                    {cart.map(item => (
                      <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #222' }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{item.name}</div>
                          <div style={{ fontSize:12, color:'#888' }}>₹{item.price} × {item.qty}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ color:'#ff3c00', fontWeight:700, fontSize:14 }}>₹{item.price*item.qty}</span>
                          <button onClick={() => removeItem(item.id)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16 }}>✕</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, marginTop:12, marginBottom:14 }}>
                      <span>Total</span><span style={{ color:'#ff3c00' }}>₹{total}</span>
                    </div>
                    <button className="add-btn primary" onClick={checkoutWhatsApp}>💬 Order via WhatsApp</button>
                  </>
                }
              </div>
            )}
          </div>
        </div>

        {loading && <div style={{ textAlign:'center', padding:80 }}><Spin/><p style={{ color:'#555' }}>Loading store…</p></div>}

        {/* ── CATEGORIES ── */}
        {!loading && view === 'categories' && (
          <div className="store-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:24, maxWidth:1100, margin:'0 auto' }}>
            {storeData.categories.map(cat => (
              <div key={cat.id} className="card store-card" onClick={() => selectCat(cat)} style={{ overflow:'hidden' }}>
                <img src={cat.image || ph} alt={cat.name} style={{ width:'100%', height:190, objectFit:'cover', display:'block' }}/>
                <div style={{ padding:'20px 24px', textAlign:'center' }}>
                  <h3 style={{ color:'#ff3c00', fontSize:20, marginBottom:4 }}>{cat.name}</h3>
                  <p style={{ color:'#555', fontSize:13 }}>
                    {storeData.products.filter(p => p.categoryId === cat.id && p.inStock).length} products
                  </p>
                </div>
              </div>
            ))}
            {storeData.categories.length === 0 && <p style={{ color:'#555', textAlign:'center', gridColumn:'1/-1', padding:40 }}>No categories yet.</p>}
          </div>
        )}

        {/* ── SUBCATEGORIES ── */}
        {!loading && view === 'subcategories' && (
          <>
            <button onClick={goBack} style={{ background:'none',border:'none',color:'#ff3c00',cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8,marginBottom:28 }}>← Back</button>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2,color:'#fff',marginBottom:24 }}>{activeCat?.name}</h2>
            <div className="store-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, maxWidth:1100, margin:'0 auto' }}>
              {subcatsForCat.map(sub => (
                <div key={sub.id} className="card store-card" onClick={() => selectSub(sub)} style={{ overflow:'hidden' }}>
                  <img src={sub.image || ph} alt={sub.name} style={{ width:'100%', height:150, objectFit:'cover', display:'block' }}/>
                  <div style={{ padding:'16px 20px', textAlign:'center' }}>
                    <h3 style={{ color:'#ff3c00', fontSize:17 }}>{sub.name}</h3>
                    <p style={{ color:'#555', fontSize:12, marginTop:4 }}>
                      {storeData.products.filter(p => p.subcategoryId === sub.id && p.inStock).length} items
                    </p>
                  </div>
                </div>
              ))}
              {subcatsForCat.length === 0 && <p style={{ color:'#555', gridColumn:'1/-1', textAlign:'center', padding:40 }}>No subcategories in this category.</p>}
            </div>
          </>
        )}

        {/* ── PRODUCTS ── */}
        {!loading && view === 'products' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
              <button onClick={goBack} style={{ background:'none',border:'none',color:'#ff3c00',cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8 }}>← Back</button>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,color:'#fff',flex:1,textAlign:'center' }}>{activeSub?.name}</h2>
              <input className="form-input" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:220 }}/>
            </div>

            <div className="store-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:24, maxWidth:1100, margin:'0 auto' }}>
              {displayProducts.map(p => (
                <div key={p.id} className="card" style={{ overflow:'hidden', animation:'fadeIn .35s ease both' }}>
                  <img src={p.image || ph} alt={p.name} style={{ width:'100%', height:200, objectFit:'cover', display:'block' }}/>
                  <div style={{ padding:20 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>{p.name}</h3>
                    {p.description && <p style={{ color:'#888', fontSize:13, lineHeight:1.6, marginBottom:10 }}>{p.description}</p>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                      <span style={{ color:'#ff3c00', fontWeight:800, fontSize:20 }}>₹{p.price}</span>
                      <span style={{ color:'#22c55e', fontSize:12, fontWeight:600 }}>● In Stock</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <button className={`add-btn ${added===p.id ? 'success' : 'primary'}`} onClick={() => handleAdd(p)}>
                        {added===p.id ? '✓ Added to Cart' : '🛒 Add to Cart'}
                      </button>
                      <button className="add-btn ghost" onClick={() => buyWhatsApp(p.name, p.price)}>
                        💬 Buy via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {displayProducts.length === 0 && <p style={{ color:'#555', gridColumn:'1/-1', textAlign:'center', padding:60 }}>No products found.</p>}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
