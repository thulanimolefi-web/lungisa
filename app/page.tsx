'use client'

export default function Home() {

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --terra:#C4593A;--terra-d:#9E3E24;--terra-l:#E07A5F;
          --cream:#F5F0E8;--cream-d:#EAE3D6;
          --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
          --sand:#D4C9B4;--white:#FAFAF7;
          --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
        }
        html{scroll-behavior:smooth}
        body{background:var(--cream);color:var(--charcoal);font-family:var(--fb);overflow-x:hidden}
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(44,44,40,0.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(196,89,58,0.2)}
        .nav-word{font-family:var(--fd);font-size:26px;letter-spacing:2px;color:var(--cream);text-decoration:none}
        .nav-links{display:flex;align-items:center;gap:28px}
        .nav-links a{font-family:var(--fc);font-size:14px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;color:var(--sand)}
        .nav-cta{background:var(--terra)!important;color:var(--white)!important;padding:8px 20px;border-radius:4px}
        .hero{min-height:100vh;background:var(--charcoal);padding:140px 60px 80px;position:relative;overflow:hidden}
        .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 50%,rgba(196,89,58,.12) 0%,transparent 70%);pointer-events:none}
        .hero-inner{max-width:700px;position:relative;z-index:1}
        .hero-eye{font-family:var(--fc);font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra-l);margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .hero-eye::before{content:'';width:28px;height:2px;background:var(--terra)}
        .hero-h1{font-family:var(--fd);font-size:clamp(64px,8vw,110px);line-height:.92;letter-spacing:2px;color:var(--cream);margin-bottom:8px}
        .hero-h1 span{color:var(--terra)}
        .hero-sub{font-family:var(--fc);font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--sand);margin-bottom:28px}
        .hero-body{font-size:17px;line-height:1.7;color:rgba(245,240,232,0.7);max-width:480px;margin-bottom:40px}
        .hero-body strong{color:var(--terra-l)}
        .hero-btns{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
        .btn-p{font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--terra);color:var(--white);padding:14px 32px;border-radius:4px;border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:background .2s}
        .btn-p:hover{background:var(--terra-l)}
        .btn-s{font-family:var(--fc);font-size:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;background:transparent;color:var(--sand);padding:14px 32px;border-radius:4px;border:1px solid rgba(212,201,180,0.3);cursor:pointer;text-decoration:none;transition:all .2s}
        .btn-s:hover{border-color:var(--sand);color:var(--cream)}
        .hero-stats{display:flex;gap:40px;margin-top:48px;padding-top:32px;border-top:1px solid rgba(212,201,180,0.15)}
        .snum{font-family:var(--fd);font-size:38px;color:var(--terra-l)}
        .slbl{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l)}
        .how{padding:120px 60px;background:var(--cream);position:relative}
        .how::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--terra),var(--terra-l),transparent)}
        .sec-eye{font-family:var(--fc);font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra);text-align:center;margin-bottom:12px}
        .sec-h{font-family:var(--fd);font-size:clamp(48px,6vw,80px);line-height:.92;letter-spacing:2px;text-align:center;color:var(--charcoal);margin-bottom:16px}
        .sec-b{font-size:17px;line-height:1.7;color:var(--charcoal-l);text-align:center;max-width:560px;margin:0 auto 72px}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;max-width:1100px;margin:0 auto}
        .step{background:var(--charcoal);padding:48px 36px;position:relative;overflow:hidden}
        .step:first-child{border-radius:8px 0 0 8px}
        .step:last-child{border-radius:0 8px 8px 0}
        .step::before{content:attr(data-num);position:absolute;top:-10px;right:16px;font-family:var(--fd);font-size:100px;color:rgba(196,89,58,.1);line-height:1;pointer-events:none}
        .step-ico{width:48px;height:48px;background:var(--terra);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:24px}
        .step-t{font-family:var(--fc);font-size:24px;font-weight:700;letter-spacing:1px;color:var(--cream);margin-bottom:12px}
        .step-b{font-size:15px;line-height:1.65;color:rgba(245,240,232,0.6)}
        .trust{padding:100px 60px;background:var(--cream-d)}
        .trust-inner{max-width:1100px;margin:0 auto;text-align:center}
        .trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:56px;text-align:left}
        .trust-card{background:var(--white);border-radius:8px;padding:36px 32px;border-bottom:3px solid var(--terra)}
        .trust-num{font-family:var(--fd);font-size:52px;color:var(--terra);margin-bottom:8px}
        .trust-title{font-family:var(--fc);font-size:18px;font-weight:700;letter-spacing:1px;color:var(--charcoal);margin-bottom:10px}
        .trust-body{font-size:14px;line-height:1.65;color:var(--charcoal-l)}
        .trade{padding:120px 60px;background:var(--terra);position:relative;overflow:hidden}
        .trade::before{content:'LUNGISA';position:absolute;right:-40px;top:50%;transform:translateY(-50%);font-family:var(--fd);font-size:220px;color:rgba(0,0,0,.08);line-height:1;pointer-events:none}
        .trade-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1}
        .trade-h{font-family:var(--fd);font-size:clamp(48px,5vw,72px);line-height:.92;letter-spacing:2px;color:var(--white);margin-bottom:24px}
        .trade-body{font-size:17px;line-height:1.7;color:rgba(255,255,255,0.8);margin-bottom:36px}
        .trade-perks{list-style:none}
        .trade-perks li{display:flex;align-items:center;gap:12px;font-family:var(--fc);font-size:16px;font-weight:600;color:rgba(255,255,255,.9);padding:10px 0;border-bottom:1px solid rgba(255,255,255,.12)}
        .trade-perks li::before{content:'';width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.6);flex-shrink:0}
        .btn-w{font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--white);color:var(--terra);padding:14px 32px;border-radius:4px;border:none;cursor:pointer;margin-top:28px;display:inline-block;text-decoration:none}
        .skill-cloud{display:flex;flex-wrap:wrap;gap:10px}
        .skill-chip{font-family:var(--fc);font-size:14px;font-weight:600;letter-spacing:1px;background:rgba(0,0,0,.15);color:rgba(255,255,255,.85);padding:10px 18px;border-radius:4px;border:1px solid rgba(255,255,255,.15)}
        .waitlist{padding:120px 60px;background:var(--charcoal);text-align:center;position:relative}
        .waitlist-inner{max-width:580px;margin:0 auto;position:relative;z-index:1}
        .signup-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}
        .btn-w2{font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:transparent;color:rgba(245,240,232,.6);padding:14px 28px;border-radius:4px;border:1px solid rgba(255,255,255,.15);cursor:pointer;text-decoration:none;transition:all .2s}
        .btn-w2:hover{border-color:rgba(255,255,255,.4);color:var(--cream)}
        .city-pills{display:flex;justify-content:center;gap:16px;margin-top:32px;flex-wrap:wrap}
        .city-pill{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.4);border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:20px}
        .city-pill.active{color:var(--terra-l);border-color:rgba(196,89,58,.3)}
        .footer{background:#1A1A16;padding:48px 60px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.06);flex-wrap:wrap;gap:20px}
        .footer-logo{font-family:var(--fd);font-size:28px;color:var(--cream);letter-spacing:3px}
        .footer-tag{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--charcoal-l);margin-top:4px}
        .footer-links{display:flex;gap:24px;flex-wrap:wrap}
        .footer-links a{font-family:var(--fc);font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(245,240,232,.35);text-decoration:none}
        .footer-copy{font-size:12px;color:rgba(245,240,232,.2)}
        @media(max-width:900px){
          .nav{padding:14px 20px}
          .hero{padding:100px 24px 60px;text-align:center}
          .hero-eye{justify-content:center}
          .hero-btns{justify-content:center}
          .hero-stats{justify-content:center}
          .steps{grid-template-columns:1fr}
          .step:first-child,.step:last-child{border-radius:0}
          .trust-grid{grid-template-columns:1fr}
          .trade-inner{grid-template-columns:1fr}
          .how,.trust,.waitlist{padding:80px 24px}
          .trade{padding:80px 24px}
          .footer{padding:40px 24px;flex-direction:column;align-items:flex-start}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-word">LUNGISA</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#trade">For tradespeople</a>
          <a href="/auth" className="nav-cta">Get started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eye">South Africa&apos;s first bidding marketplace for home repairs</div>
          <h1 className="hero-h1">POST<br/>IT. <span>BID</span><br/>IT. FIX IT.</h1>
          <div className="hero-sub">Joburg&apos;s home repair marketplace</div>
          <p className="hero-body">
            Describe your job. Get competitive bids from <strong>vetted local tradespeople</strong>.
            Negotiate the price. Pay safely — only released when the job is done.
          </p>
          <div className="hero-btns">
            <a href="/auth" className="btn-p">Post a job free →</a>
            <a href="#how" className="btn-s">See how it works</a>
          </div>
          <div className="hero-stats">
            <div><div className="snum">R0</div><div className="slbl">Commission to post</div></div>
            <div><div className="snum">5min</div><div className="slbl">To first bid</div></div>
            <div><div className="snum">100%</div><div className="slbl">Escrow protected</div></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="sec-eye">Simple. Transparent. Fair.</div>
        <h2 className="sec-h">HOW IT<br/>WORKS</h2>
        <p className="sec-b">Three steps between you and a fixed home — with full price control in your hands the whole time.</p>
        <div className="steps">
          <div className="step" data-num="1">
            <div className="step-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div className="step-t">Post your job</div>
            <p className="step-b">Describe what&apos;s broken — plumbing, electrical, painting, whatever. Add a photo. Set your rough budget. Done in under 2 minutes.</p>
          </div>
          <div className="step" data-num="2">
            <div className="step-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="step-t">Get bids &amp; negotiate</div>
            <p className="step-b">Vetted tradespeople bid with their price and ETA. Not happy? Counter-offer. Accept when you&apos;re satisfied — no pressure.</p>
          </div>
          <div className="step" data-num="3">
            <div className="step-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="step-t">Pay safely when done</div>
            <p className="step-b">Payment is held in escrow. The tradesperson only gets paid once you confirm the job is complete. Zero risk.</p>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <div className="trust-inner">
          <div className="sec-eye">Built for South Africa</div>
          <h2 className="sec-h">WHY<br/>LUNGISA</h2>
          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-num">100%</div>
              <div className="trust-title">Vetted tradespeople</div>
              <p className="trust-body">Every tradesperson is ID-verified and background-checked before their first job. No chancers.</p>
            </div>
            <div className="trust-card">
              <div className="trust-num">R0</div>
              <div className="trust-title">Free for homeowners</div>
              <p className="trust-body">Posting a job and getting bids costs you nothing. We earn a small commission from the tradesperson only when a job is completed.</p>
            </div>
            <div className="trust-card">
              <div className="trust-num">★ 4.8</div>
              <div className="trust-title">Rated after every job</div>
              <p className="trust-body">Every completed job gets a rating. Tradespeople with poor ratings are removed. Consistent quality, every time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRADE */}
      <section className="trade" id="trade">
        <div className="trade-inner">
          <div>
            <h2 className="trade-h">GROW YOUR<br/>BUSINESS<br/>WITH US</h2>
            <p className="trade-body">No more word-of-mouth hustle. Lungisa puts a steady stream of paying jobs in your pocket — you set your own prices.</p>
            <ul className="trade-perks">
              <li>Bid on jobs in your area, at your price</li>
              <li>Get paid securely — no chasing invoices</li>
              <li>Build a verified rating that wins more work</li>
              <li>Free to join — no monthly subscription</li>
            </ul>
            <a href="/join" className="btn-w">Join as a tradesperson →</a>
          </div>
          <div>
            <div className="skill-cloud">
              {['Plumbing','Electrical','Painting','Tiling','Carpentry','Roofing','Plastering','Welding','Solar install','HVAC','Waterproofing','Landscaping'].map(s=>(
                <span key={s} className="skill-chip">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="waitlist" id="waitlist">
        <div className="waitlist-inner">
          <div className="sec-eye">Live now in Johannesburg</div>
          <h2 className="sec-h" style={{color:'var(--cream)'}}>GET STARTED<br/>TODAY</h2>
          <p className="sec-b" style={{color:'rgba(245,240,232,0.6)',marginBottom:40}}>
            Lungisa is live. Post your first job free or join as a tradesperson and start bidding on jobs near you.
          </p>
          <div className="signup-btns">
            <a href="/auth" className="btn-p">Post a job free →</a>
            <a href="/join" className="btn-w2">Join as tradesperson</a>
          </div>
          <div className="city-pills">
            <span className="city-pill active">Johannesburg ✦</span>
            <span className="city-pill">Cape Town — coming soon</span>
            <span className="city-pill">Durban — coming soon</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <div className="footer-logo">LUNGISA</div>
          <div className="footer-tag">Post It. Bid It. Fix It.</div>
        </div>
        <div className="footer-links">
          <a href="#how">How it works</a>
          <a href="#trade">For tradespeople</a>
          <a href="#">Privacy</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-copy">© 2026 Lungisa · Built in South Africa 🇿🇦</div>
      </footer>
    </>
  )
}
