'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState<'homeowner'|'tradesperson'>('homeowner')
  const [counting, setCounting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    const observer = new IntersectionObserver(entries => {
      if(entries[0].isIntersecting) setCounting(true)
    }, { threshold: 0.3 })
    if(statsRef.current) observer.observe(statsRef.current)

    return () => { window.removeEventListener('scroll', onScroll); observer.disconnect() }
  }, [])

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;--terra-d:#9E3E24;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#D4CAB8;
      --charcoal:#2C2C28;--charcoal-l:#5A5952;
      --green:#3DAA6A;--gold:#E8A020;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html{scroll-behavior:smooth}
    body{font-family:var(--fb);background:var(--cream);color:var(--charcoal);overflow-x:hidden}
    @keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
    @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
    @keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

    /* NAV */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 40px;height:68px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
    .nav.scrolled{background:rgba(245,240,232,.97);backdrop-filter:blur(12px);border-bottom:1px solid var(--cream-d);box-shadow:0 2px 20px rgba(0,0,0,.06)}
    .nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none}
    .nav-hex{width:34px;height:34px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;transition:transform .2s}
    .nav-hex:hover{transform:rotate(15deg)}
    .nav-word{font-family:var(--fd);font-size:26px;letter-spacing:3px;color:var(--charcoal)}
    .nav-links{display:flex;align-items:center;gap:32px}
    .nav-link{font-family:var(--fc);font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--charcoal-l);cursor:pointer;text-decoration:none;transition:color .2s}
    .nav-link:hover{color:var(--terra)}
    .nav-cta{background:var(--terra);color:#fff;border:none;padding:10px 22px;border-radius:6px;font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all .15s}
    .nav-cta:hover{background:var(--terra-l);transform:translateY(-1px)}

    /* HERO */
    .hero{min-height:100vh;background:var(--charcoal);position:relative;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:120px 40px 80px}
    .hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(196,89,58,.15) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(232,160,32,.06) 0%,transparent 50%)}
    .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:60px 60px;opacity:.5}
    .hero-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(196,89,58,.15);border:1px solid rgba(196,89,58,.3);border-radius:100px;padding:6px 16px;font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--terra-l);margin-bottom:24px;animation:fadeUp .6s ease both}
    .hero-dot{width:6px;height:6px;border-radius:50%;background:var(--terra);animation:pulse 2s infinite}
    .hero-h1{font-family:var(--fd);font-size:clamp(64px,10vw,130px);line-height:.9;letter-spacing:2px;color:#F5F0E8;margin-bottom:8px;animation:fadeUp .6s .1s ease both}
    .hero-h1 span{color:var(--terra)}
    .hero-sub{font-size:clamp(16px,2vw,20px);color:rgba(245,240,232,.55);line-height:1.6;max-width:520px;margin-bottom:40px;animation:fadeUp .6s .2s ease both}
    .hero-btns{display:flex;gap:14px;flex-wrap:wrap;animation:fadeUp .6s .3s ease both}
    .btn-primary{background:var(--terra);color:#fff;border:none;padding:16px 32px;border-radius:8px;font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:8px}
    .btn-primary:hover{background:var(--terra-l);transform:translateY(-2px);box-shadow:0 8px 24px rgba(196,89,58,.3)}
    .btn-secondary{background:transparent;color:rgba(245,240,232,.8);border:1px solid rgba(245,240,232,.2);padding:16px 32px;border-radius:8px;font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .15s}
    .btn-secondary:hover{border-color:rgba(245,240,232,.5);color:#F5F0E8;background:rgba(245,240,232,.05)}

    /* HERO CARD */
    .hero-card{position:absolute;right:8%;top:50%;transform:translateY(-50%);width:320px;background:rgba(245,240,232,.05);backdrop-filter:blur(20px);border:1px solid rgba(245,240,232,.1);border-radius:16px;padding:24px;animation:fadeIn .8s .5s ease both}
    .hc-job{background:rgba(245,240,232,.06);border-radius:10px;padding:16px;margin-bottom:12px}
    .hc-cat{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--terra-l);margin-bottom:6px;display:flex;align-items:center;gap:6px}
    .hc-title{font-family:var(--fd);font-size:22px;letter-spacing:1px;color:#F5F0E8;margin-bottom:4px}
    .hc-area{font-size:12px;color:rgba(245,240,232,.4)}
    .hc-bids{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
    .hc-bid-item{text-align:center}
    .hc-bid-val{font-family:var(--fd);font-size:22px;color:var(--terra-l)}
    .hc-bid-lbl{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,240,232,.3)}
    .hc-status{background:rgba(61,170,106,.15);border:1px solid rgba(61,170,106,.25);border-radius:6px;padding:8px 12px;font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#3DAA6A;display:flex;align-items:center;gap:6px}

    /* STATS */
    .stats{background:var(--terra);padding:28px 40px}
    .stats-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
    .stat-item{text-align:center}
    .stat-n{font-family:var(--fd);font-size:42px;letter-spacing:1px;color:#fff}
    .stat-l{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:4px}

    /* SECTIONS */
    .section{padding:100px 40px;max-width:1100px;margin:0 auto}
    .section-tag{font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--terra);margin-bottom:16px}
    .section-h{font-family:var(--fd);font-size:clamp(40px,6vw,72px);line-height:.95;letter-spacing:1px;color:var(--charcoal);margin-bottom:20px}
    .section-h span{color:var(--terra)}
    .section-sub{font-size:17px;color:var(--charcoal-l);line-height:1.7;max-width:560px}

    /* HOW IT WORKS */
    .hiw{background:#fff;padding:100px 40px}
    .hiw-inner{max-width:1100px;margin:0 auto}
    .hiw-tabs{display:flex;gap:0;background:var(--cream);border-radius:10px;padding:4px;margin-bottom:56px;width:fit-content}
    .hiw-tab{font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:12px 28px;border-radius:8px;cursor:pointer;transition:all .2s;border:none;background:transparent;color:var(--charcoal-l)}
    .hiw-tab.active{background:var(--terra);color:#fff;box-shadow:0 4px 12px rgba(196,89,58,.3)}
    .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
    .step{position:relative;padding:28px;background:var(--cream);border-radius:12px;border:1px solid var(--cream-d)}
    .step-n{font-family:var(--fd);font-size:56px;letter-spacing:1px;color:var(--cream-dd);line-height:1;margin-bottom:12px}
    .step-icon{font-size:28px;margin-bottom:12px;display:block}
    .step-h{font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:.5px;color:var(--charcoal);margin-bottom:8px}
    .step-p{font-size:14px;color:var(--charcoal-l);line-height:1.6}
    .step-connector{position:absolute;right:-13px;top:50%;transform:translateY(-50%);width:24px;height:2px;background:var(--cream-dd);z-index:1}

    /* WHY LUNGISA */
    .why{background:var(--charcoal);padding:100px 40px}
    .why-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
    .why-card{background:rgba(245,240,232,.04);border:1px solid rgba(245,240,232,.08);border-radius:12px;padding:24px;margin-bottom:16px;display:flex;gap:16px;align-items:flex-start;transition:border-color .2s}
    .why-card:hover{border-color:rgba(196,89,58,.3)}
    .why-icon{width:44px;height:44px;border-radius:10px;background:rgba(196,89,58,.15);border:1px solid rgba(196,89,58,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .why-h{font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:.5px;color:#F5F0E8;margin-bottom:4px}
    .why-p{font-size:13px;color:rgba(245,240,232,.45);line-height:1.6}

    /* TRADES */
    .trades{padding:100px 40px}
    .trades-inner{max-width:1100px;margin:0 auto}
    .trades-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:48px}
    .trade-chip{background:#fff;border:1px solid var(--cream-d);border-radius:10px;padding:20px 16px;text-align:center;cursor:pointer;transition:all .2s}
    .trade-chip:hover{border-color:var(--terra);transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
    .trade-emoji{font-size:28px;margin-bottom:8px;display:block}
    .trade-name{font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--charcoal-l)}

    /* TESTIMONIALS */
    .testi{background:var(--cream-d);padding:100px 40px}
    .testi-inner{max-width:1100px;margin:0 auto}
    .testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;margin-top:48px}
    .testi-card{background:#fff;border-radius:12px;padding:28px;border:1px solid var(--cream-d)}
    .testi-stars{color:var(--gold);font-size:16px;margin-bottom:14px}
    .testi-text{font-size:15px;color:var(--charcoal);line-height:1.7;margin-bottom:20px;font-style:italic}
    .testi-author{display:flex;align-items:center;gap:12px}
    .testi-av{width:40px;height:40px;border-radius:50%;background:var(--terra);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:18px;color:#fff}
    .testi-name{font-family:var(--fc);font-size:14px;font-weight:700;color:var(--charcoal)}
    .testi-role{font-size:12px;color:var(--charcoal-l)}

    /* CTA SECTION */
    .cta-section{background:var(--terra);padding:100px 40px;text-align:center;position:relative;overflow:hidden}
    .cta-bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,255,255,.08) 0%,transparent 70%)}
    .cta-h{font-family:var(--fd);font-size:clamp(48px,8vw,100px);line-height:.9;letter-spacing:2px;color:#fff;margin-bottom:20px;position:relative}
    .cta-sub{font-size:18px;color:rgba(255,255,255,.7);margin-bottom:40px;position:relative}
    .cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative}
    .btn-white{background:#fff;color:var(--terra);border:none;padding:16px 36px;border-radius:8px;font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .15s}
    .btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.15)}
    .btn-outline-white{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4);padding:16px 36px;border-radius:8px;font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .15s}
    .btn-outline-white:hover{border-color:#fff;background:rgba(255,255,255,.1)}

    /* FOOTER */
    .footer{background:var(--charcoal);padding:60px 40px 32px}
    .footer-inner{max-width:1100px;margin:0 auto}
    .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.08)}
    .footer-brand p{font-size:14px;color:rgba(245,240,232,.35);line-height:1.7;margin-top:14px;max-width:280px}
    .footer-col-h{font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.3);margin-bottom:16px}
    .footer-link{display:block;font-size:14px;color:rgba(245,240,232,.5);margin-bottom:10px;cursor:pointer;transition:color .15s;text-decoration:none}
    .footer-link:hover{color:var(--terra-l)}
    .footer-bottom{display:flex;align-items:center;justify-content:space-between}
    .footer-copy{font-size:13px;color:rgba(245,240,232,.2)}
    .footer-badge{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.2)}

    /* TRUST BAR */
    .trust{background:#fff;border-top:1px solid var(--cream-d);border-bottom:1px solid var(--cream-d);padding:20px 40px}
    .trust-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap}
    .trust-item{display:flex;align-items:center;gap:8px;font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--charcoal-l)}
    .trust-dot{width:8px;height:8px;border-radius:50%;background:var(--green)}

    /* RESPONSIVE */
    @media(max-width:900px){
      .nav{padding:0 20px}
      .nav-links{display:none}
      .hero{padding:100px 20px 60px}
      .hero-card{display:none}
      .hero-h1{font-size:72px}
      .stats-inner{grid-template-columns:1fr 1fr}
      .section{padding:60px 20px}
      .hiw{padding:60px 20px}
      .why{padding:60px 20px}
      .why-inner{grid-template-columns:1fr;gap:40px}
      .trades{padding:60px 20px}
      .testi{padding:60px 20px}
      .cta-section{padding:60px 20px}
      .footer{padding:40px 20px 24px}
      .footer-top{grid-template-columns:1fr 1fr;gap:24px}
      .footer-bottom{flex-direction:column;gap:12px;text-align:center}
    }
    @media(max-width:480px){
      .stats-inner{grid-template-columns:1fr 1fr;gap:12px}
      .hero-h1{font-size:56px}
      .hero-btns{flex-direction:column}
      .btn-primary,.btn-secondary{width:100%;justify-content:center}
      .footer-top{grid-template-columns:1fr}
    }
  `

  const homeownerSteps = [
    { n:'01', icon:'📋', h:'Post your job', p:'Describe what needs fixing, add photos, set your budget. Free to post — takes 2 minutes.' },
    { n:'02', icon:'💬', h:'Receive bids', p:'Vetted tradespeople in your area send competitive bids. No call centres, no middlemen.' },
    { n:'03', icon:'🤝', h:'Negotiate', p:"Counter-offer until you're happy. The price you agree on is what you pay — nothing more." },
    { n:'04', icon:'🔒', h:'Pay safely', p:'Payment held in escrow. Released to the tradesperson only when you confirm the job is done.' },
  ]

  const tradespersonSteps = [
    { n:'01', icon:'👤', h:'Create your profile', p:'Set your trade, service areas, and upload your ID for verification. Free to join.' },
    { n:'02', icon:'🔍', h:'Browse local jobs', p:'See jobs in your area that match your trade. No chasing leads — they come to you.' },
    { n:'03', icon:'💰', h:'Bid your price', p:'Submit your best price and negotiate directly with the homeowner. You set your rate.' },
    { n:'04', icon:'✅', h:'Get paid securely', p:'Complete the job, submit photos, and payment is released. 5% commission only on success.' },
  ]

  const whyCards = [
    { icon:'⚖️', h:'True negotiation', p:'Counter-offers, not fixed prices. Homeowners and tradespeople agree on a fair price together.' },
    { icon:'🔒', h:'Escrow protection', p:'Money is held securely and only released when the homeowner confirms the job is done right.' },
    { icon:'✓', h:'Vetted tradespeople', p:'ID-verified tradespeople with real reviews from real jobs. Trust built into the platform.' },
    { icon:'💳', h:'5% only on success', p:'No subscriptions, no listing fees. Tradespeople pay 5% only when they complete a paid job.' },
    { icon:'📸', h:'Photo evidence', p:'Tradespeople submit completion photos and a work report before payment is released.' },
    { icon:'⚡', h:'Real-time bidding', p:'Bids and counter-offers happen in real time. No waiting 3 days for a callback.' },
  ]

  const trades = [
    {e:'🔧',n:'Plumbing'},{e:'⚡',n:'Electrical'},{e:'🎨',n:'Painting'},
    {e:'🪚',n:'Carpentry'},{e:'🏠',n:'Roofing'},{e:'🚿',n:'Tiling'},
    {e:'☀️',n:'Solar'},{e:'🌿',n:'Landscaping'},{e:'💧',n:'Waterproofing'},
    {e:'🔥',n:'Welding'},{e:'🧹',n:'Cleaning'},{e:'🔩',n:'General'},
    {e:'🚛',n:'Moving'},{e:'🐛',n:'Pest Control'},{e:'🔌',n:'Appliance Repair'},
    {e:'❄️',n:'Air Conditioning'},{e:'🔐',n:'Security'},{e:'🧱',n:'Paving'},
    {e:'🏗️',n:'Plastering'},
  ]

  const testimonials = [
    { stars:5, text:'"Got 4 bids within an hour of posting. Negotiated down from R1,200 to R850. The plumber was verified, on time, and the escrow meant I never had to worry about paying upfront."', name:'Nomsa K.', role:'Homeowner · Sandton', init:'NK' },
    { stars:5, text:'"I was sceptical at first but Lungisa changed how I get work. No more cold calling or relying on word of mouth. I now get 3-4 jobs a week in my area."', name:'Brian M.', role:'Plumber · Fourways', init:'BM' },
    { stars:5, text:'"The negotiation feature is what sold me. I posted a painting job, got 6 bids, and negotiated to exactly what I wanted to pay. Brilliant concept."', name:'Thabo D.', role:'Homeowner · Midrand', init:'TD' },
  ]

  // Prevent hydration mismatch — render nav class only after mount
  const navClass = mounted ? `nav${scrolled?' scrolled':''}` : 'nav'

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className={navClass}>
        <div className="nav-logo" onClick={()=>router.push('/')}>
          <div className="nav-hex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <span className="nav-word">LUNGISA</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#why" className="nav-link">Why Lungisa</a>
          <a href="#trades" className="nav-link">Trades</a>
          <button className="nav-cta" onClick={()=>router.push('/auth')}>Get started</button>
        </div>
        <button className="nav-cta" style={{display:'none'}} onClick={()=>router.push('/auth')}>Sign up</button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"/>
        <div className="hero-grid"/>
        <div style={{maxWidth:1100,margin:'0 auto',width:'100%',position:'relative',zIndex:1}}>
          <div className="hero-tag">
            <div className="hero-dot"/>
            South Africa&apos;s home repair marketplace
          </div>
          <h1 className="hero-h1">FIX IT.<br/><span>RIGHT.</span></h1>
          <p className="hero-sub">
            Post a job, get competitive bids from vetted tradespeople, negotiate your price, pay safely. No middlemen. No call centres. No surprises.
          </p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={()=>router.push('/auth')}>
              Post a job free →
            </button>
            <button className="btn-secondary" onClick={()=>router.push('/auth?role=tradesperson')}>
              I&apos;m a tradesperson
            </button>
          </div>
        </div>

        {/* Floating job card */}
        <div className="hero-card">
          <div className="hc-job">
            <div className="hc-cat">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Plumbing · Sandton
            </div>
            <div className="hc-title">Burst pipe — kitchen</div>
            <div className="hc-area">📍 Sandton, JHB · Budget R800</div>
          </div>
          <div className="hc-bids" style={{marginBottom:12}}>
            <div className="hc-bid-item"><div className="hc-bid-val">4</div><div className="hc-bid-lbl">Bids received</div></div>
            <div className="hc-bid-item"><div className="hc-bid-val">R650</div><div className="hc-bid-lbl">Lowest bid</div></div>
            <div className="hc-bid-item"><div className="hc-bid-val">12m</div><div className="hc-bid-lbl">Response time</div></div>
          </div>
          <div className="hc-status">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Payment in escrow
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust">
        <div className="trust-inner">
          {[
            {icon:'🔒', label:'Escrow protected payments'},
            {icon:'✓', label:'ID-verified tradespeople'},
            {icon:'⭐', label:'Real reviews, real jobs'},
            {icon:'💳', label:'5% commission only'},
            {icon:'📱', label:'Fully mobile friendly'},
          ].map((t,i)=>(
            <div key={i} className="trust-item">
              <span style={{fontSize:16}}>{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="stats" ref={statsRef}>
        <div className="stats-inner">
          {[
            {n:'5%', l:'Commission on success'},
            {n:'R0', l:'Cost to post a job'},
            {n:'24h', l:'Average first bid'},
            {n:'100%', l:'Escrow protected'},
          ].map((s,i)=>(
            <div key={i} className="stat-item">
              <div
                className="stat-n"
                style={mounted && counting ? {animation:`countUp .4s ${i*.1}s ease both`} : {}}
              >
                {s.n}
              </div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" className="hiw">
        <div className="hiw-inner">
          <div className="section-tag">How it works</div>
          <h2 className="section-h" style={{marginBottom:16}}>Simple.<br/><span>Fair.</span> Secure.</h2>
          <p className="section-sub" style={{marginBottom:40}}>Whether you need a job done or you&apos;re a tradesperson looking for work — Lungisa makes it simple.</p>

          <div className="hiw-tabs">
            <button className={`hiw-tab${activeTab==='homeowner'?' active':''}`} onClick={()=>setActiveTab('homeowner')}>For homeowners</button>
            <button className={`hiw-tab${activeTab==='tradesperson'?' active':''}`} onClick={()=>setActiveTab('tradesperson')}>For tradespeople</button>
          </div>

          <div className="steps">
            {(activeTab==='homeowner'?homeownerSteps:tradespersonSteps).map((s,i)=>(
              <div key={i} className="step">
                <div className="step-n">{s.n}</div>
                <span className="step-icon">{s.icon}</span>
                <div className="step-h">{s.h}</div>
                <p className="step-p">{s.p}</p>
                {i < 3 && <div className="step-connector"/>}
              </div>
            ))}
          </div>

          <div style={{textAlign:'center',marginTop:48}}>
            <button className="btn-primary" onClick={()=>router.push('/auth')} style={{margin:'0 auto'}}>
              {activeTab==='homeowner'?'Post your first job free →':'Join as a tradesperson →'}
            </button>
          </div>
        </div>
      </div>

      {/* WHY LUNGISA */}
      <div id="why" className="why">
        <div className="why-inner">
          <div>
            <div className="section-tag" style={{color:' var(--terra-l)'}}>Why Lungisa</div>
            <h2 className="section-h" style={{color:'#F5F0E8',marginBottom:20}}>Built for<br/><span>South Africa.</span></h2>
            <p style={{fontSize:16,color:'rgba(245,240,232,.45)',lineHeight:1.8,marginBottom:32}}>
              Existing platforms don&apos;t negotiate. They quote, you accept or decline. Lungisa gives both parties a voice — and escrow makes sure everyone&apos;s protected.
            </p>
            <button className="btn-primary" onClick={()=>router.push('/auth')}>Get started free →</button>
          </div>
          <div>
            {whyCards.map((c,i)=>(
              <div key={i} className="why-card">
                <div className="why-icon">{c.icon}</div>
                <div>
                  <div className="why-h">{c.h}</div>
                  <div className="why-p">{c.p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRADES */}
      <div id="trades" className="trades">
        <div className="trades-inner">
          <div className="section-tag">Trades covered</div>
          <h2 className="section-h">Whatever needs<br/><span>fixing.</span></h2>
          <div className="trades-grid">
            {trades.map((t,i)=>(
              <div key={i} className="trade-chip" onClick={()=>router.push('/auth')}>
                <span className="trade-emoji">{t.e}</span>
                <div className="trade-name">{t.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="testi">
        <div className="testi-inner">
          <div className="section-tag">What people say</div>
          <h2 className="section-h">Real jobs.<br/><span>Real results.</span></h2>
          <div className="testi-grid">
            {testimonials.map((t,i)=>(
              <div key={i} className="testi-card">
                <div className="testi-stars">{'★'.repeat(t.stars)}</div>
                <p className="testi-text">{t.text}</p>
                <div className="testi-author">
                  <div className="testi-av">{t.init}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-section">
        <div className="cta-bg"/>
        <h2 className="cta-h">READY TO<br/>LUNGISA?</h2>
        <p className="cta-sub">Join homeowners and tradespeople across Johannesburg. Free to start.</p>
        <div className="cta-btns">
          <button className="btn-white" onClick={()=>router.push('/auth')}>Post a job — it&apos;s free</button>
          <button className="btn-outline-white" onClick={()=>router.push('/auth?role=tradesperson')}>Join as a tradesperson</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div className="nav-hex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:3,color:'#F5F0E8'}}>LUNGISA</span>
              </div>
              <p>South Africa&apos;s home repair marketplace. Fix it right, pay safely, build trust.</p>
              <div style={{marginTop:16,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.2)'}}>
                A VaultLink Africa product
              </div>
            </div>
            <div>
              <div className="footer-col-h">Homeowners</div>
              <a href="/auth" className="footer-link">Post a job</a>
              <a href="/home" className="footer-link">My dashboard</a>
              <a href="#how-it-works" className="footer-link">How it works</a>
            </div>
            <div>
              <div className="footer-col-h">Tradespeople</div>
              <a href="/auth" className="footer-link">Join free</a>
              <a href="/dashboard" className="footer-link">My dashboard</a>
              <a href="#trades" className="footer-link">Trades covered</a>
            </div>
            <div>
              <div className="footer-col-h">Company</div>
              <a href="https://vaultlinkafrica.com" className="footer-link" target="_blank" rel="noreferrer">VaultLink Africa</a>
              <a href="mailto:support@lungiza.co.za" className="footer-link">Contact us</a>
              <a href="mailto:support@lungiza.co.za" className="footer-link">Support</a>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Lungisa · TVM Capital Link Pty Ltd · All rights reserved</div>
            <div className="footer-badge">Johannesburg, South Africa 🇿🇦</div>
          </div>
        </div>
      </footer>
    </>
  )
}
