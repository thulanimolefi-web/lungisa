'use client'

export default function Home() {
  return (
    <>
      <style>{}</style>

      <nav>
        <a className="nav-logo" href="#">
          <span className="nav-wordmark">LUNGISA</span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#trade">For tradespeople</a>
          <a href="#waitlist" className="nav-cta">Get early access</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div>
          <div className="hero-eyebrow">South Africa&apos;s first bidding marketplace for home repairs</div>
          <h1 className="hero-headline">POST<br/>IT. <span>BID</span><br/>IT. FIX IT.</h1>
          <div className="hero-sub">Post It. Bid It. Fix It.</div>
          <p className="hero-body">
            Describe your job. Get competitive bids from <strong>vetted local tradespeople</strong>.
            Negotiate the price. Pay safely — only released when the job is done.
          </p>
          <div className="hero-actions">
            <a href="#waitlist" className="btn-primary">Get early access</a>
            <a href="#how" className="btn-secondary">See how it works</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-num">R0</div>
              <div className="stat-label">Commission to post</div>
            </div>
            <div>
              <div className="stat-num">5min</div>
              <div className="stat-label">To first bid</div>
            </div>
            <div>
              <div className="stat-num">100%</div>
              <div className="stat-label">Escrow protected</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="section-eyebrow">Simple. Transparent. Fair.</div>
        <h2 className="section-title">HOW IT<br/>WORKS</h2>
        <p className="section-body">Three steps between you and a fixed home — with full price control in your hands the whole time.</p>
        <div className="steps">
          <div className="step" data-num="1">
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div className="step-title">Post your job</div>
            <p className="step-body">Describe what&apos;s broken — plumbing, electrical, painting, whatever. Add a photo. Set your rough budget. Done in under 2 minutes.</p>
          </div>
          <div className="step" data-num="2">
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="step-title">Get bids &amp; negotiate</div>
            <p className="step-body">Vetted tradespeople bid with their price and ETA. Not happy? Counter-offer. Accept when you&apos;re satisfied — no pressure.</p>
          </div>
          <div className="step" data-num="3">
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="step-title">Pay safely when done</div>
            <p className="step-body">Payment is held in escrow. The tradesperson only gets paid once you confirm the job is complete. Zero risk.</p>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <div className="trust-inner">
          <div style={{textAlign:'center'}}>
            <div className="section-eyebrow">Built for South Africa</div>
            <h2 className="section-title">WHY<br/>LUNGISA</h2>
          </div>
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

      {/* FOR TRADESPEOPLE */}
      <section className="trade" id="trade">
        <div className="trade-inner">
          <div>
            <h2 className="trade-title">GROW YOUR<br/>BUSINESS<br/>WITH US</h2>
            <p className="trade-body">No more word-of-mouth hustle. Lungisa puts a steady stream of paying jobs in your pocket — you set your own prices, you choose what you bid on.</p>
            <ul className="trade-perks">
              <li>Bid on jobs in your area, at your price</li>
              <li>Get paid securely — no chasing invoices</li>
              <li>Build a verified rating that wins more work</li>
              <li>Free to join — no monthly subscription</li>
            </ul>
            <a href="#waitlist" className="btn-white">Register as a tradesperson</a>
          </div>
          <div>
            <div className="skill-cloud">
              {['Plumbing','Electrical','Painting','Tiling','Carpentry','Roofing','Plastering','Welding','Solar install','HVAC','Waterproofing','Landscaping'].map(s => (
                <span key={s} className="skill-chip">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="waitlist" id="waitlist">
        <div className="waitlist-inner">
          <div className="section-eyebrow">Launching in Johannesburg first</div>
          <h2 className="section-title" style={{color:'var(--cream)'}}>BE FIRST<br/>IN LINE</h2>
          <p className="section-body" style={{color:'rgba(245,240,232,0.6)',marginBottom:'40px'}}>
            We&apos;re onboarding our first 500 homeowners and tradespeople in Joburg. Join the waitlist — no spam, just a single launch-day email.
          </p>
          <div className="waitlist-form">
            <input type="email" className="waitlist-input" placeholder="your@email.com"/>
            <button className="waitlist-btn">Join Waitlist</button>
          </div>
          <p className="waitlist-note">No spam. We&apos;ll only email you on launch day.</p>
          <div className="city-pills">
            <span className="city-pill active">Johannesburg ✦</span>
            <span className="city-pill">Cape Town — coming soon</span>
            <span className="city-pill">Durban — coming soon</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>
          <div className="footer-logo">LUNGISA</div>
          <div className="footer-tagline">Post It. Bid It. Fix It.</div>
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
