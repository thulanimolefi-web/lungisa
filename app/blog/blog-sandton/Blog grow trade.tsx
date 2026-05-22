import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How Gauteng Tradespeople Are Growing Their Business Without Advertising (2026)',
  description: 'Plumbers, electricians and painters in Johannesburg are finding consistent work without cold calling or paying for ads. Here\'s the approach that\'s working in 2026.',
  keywords: ['grow trade business South Africa', 'find work plumber Johannesburg', 'electrician jobs Gauteng', 'more customers tradesperson SA', 'tradesperson platform South Africa'],
  openGraph: {
    title:       'How Gauteng Tradespeople Are Growing Their Business in 2026',
    description: 'Find consistent home repair work in Johannesburg without cold calling or advertising.',
    url:         'https://www.lungiza.co.za/blog/grow-your-trade-business-south-africa',
    type:        'article',
  },
}

export default function GrowTradeBusiness() {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--terra:#C4593A;--cream:#F5F0E8;--cream-d:#EAE3D6;--charcoal:#2C2C28;--charcoal-l:#5A5952;}
    body{font-family:'Barlow',sans-serif;background:var(--cream);color:var(--charcoal)}
    a{text-decoration:none;color:inherit}
    .nav{background:var(--charcoal);padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
    .nav-logo{display:flex;align-items:center;gap:10px}
    .nav-hex{width:30px;height:30px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center}
    .nav-word{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#F5F0E8}
    .nav-cta{background:var(--terra);color:#fff;border:none;padding:9px 20px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer}
    .article-wrap{max-width:740px;margin:0 auto;padding:60px 40px}
    .breadcrumb{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:var(--charcoal-l);margin-bottom:24px;display:flex;gap:8px;align-items:center}
    .breadcrumb a{color:var(--terra)}
    .article-cat{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--terra);margin-bottom:12px}
    h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,56px);letter-spacing:1px;color:var(--charcoal);line-height:1;margin-bottom:16px}
    .article-meta{font-family:'Barlow Condensed',sans-serif;font-size:12px;color:var(--charcoal-l);margin-bottom:32px;display:flex;gap:12px}
    .article-intro{font-size:18px;color:var(--charcoal);line-height:1.7;margin-bottom:32px;font-weight:500}
    h2{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.5px;color:var(--charcoal);margin:36px 0 14px}
    h3{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--charcoal);margin:24px 0 10px}
    p{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:16px}
    ul,ol{padding-left:20px;margin-bottom:16px}
    li{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:8px}
    .stat-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}
    .stat-card{background:#fff;border:1px solid var(--cream-d);border-radius:10px;padding:20px;text-align:center}
    .stat-num{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--terra);letter-spacing:1px;line-height:1}
    .stat-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--charcoal-l);margin-top:6px}
    .tip-box{background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .tip-box p{margin:0;color:#1a6e35}
    .highlight-box{background:#fff;border-left:4px solid var(--terra);border-radius:0 8px 8px 0;padding:18px 20px;margin:24px 0}
    .highlight-box p{margin:0;color:var(--charcoal)}
    .cta-box{background:var(--charcoal);border-radius:12px;padding:28px;margin:36px 0;text-align:center}
    .cta-box h3{color:#F5F0E8;font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:8px}
    .cta-box p{color:rgba(245,240,232,.6);margin-bottom:16px}
    .cta-btn{background:var(--terra);color:#fff;border:none;padding:12px 28px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;display:inline-block}
    .related{margin-top:48px;padding-top:32px;border-top:1px solid var(--cream-d)}
    .related-title{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:16px}
    .related-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .related-card{background:#fff;border:1px solid var(--cream-d);border-radius:8px;padding:16px;transition:border-color .2s}
    .related-card:hover{border-color:var(--terra)}
    .related-card-title{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--charcoal);line-height:1.4}
    .footer{background:var(--charcoal);padding:24px 40px;text-align:center;font-size:12px;color:rgba(245,240,232,.3);margin-top:60px}
    @media(max-width:600px){.article-wrap{padding:40px 20px}.stat-strip{grid-template-columns:1fr}.related-grid{grid-template-columns:1fr}.nav{padding:0 20px}}
  `

  return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-hex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <span className="nav-word">LUNGISA</span>
        </Link>
        <Link href="/auth"><button className="nav-cta">Join as a tradesperson</button></Link>
      </nav>

      <article className="article-wrap">
        <div className="breadcrumb">
          <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › For Tradespeople
        </div>

        <div className="article-cat">📈 For Tradespeople</div>
        <h1>How Gauteng Tradespeople Are Growing Their Business Without Advertising</h1>
        <div className="article-meta">
          <span>28 April 2026</span><span>·</span><span>5 min read</span><span>·</span><span>Johannesburg, Gauteng</span>
        </div>

        <p className="article-intro">
          Word of mouth only goes so far. Cold calling wastes half your day. Paying for Google ads eats your margin. Here&apos;s how plumbers, electricians, painters and carpenters in Johannesburg are finding consistent, well-paying work in 2026 — without any of that.
        </p>

        <h2>The Problem with How Most Tradespeople Find Work</h2>
        <p>The traditional way tradespeople in Gauteng find work relies on three things: word of mouth from previous clients, referrals from other tradespeople, and occasionally an ad in a local Facebook group. This works when you&apos;re busy. When it&apos;s quiet, there&apos;s no pipeline — and no way to predict when the next job will come.</p>
        <p>The tradespeople growing their businesses fastest in 2026 are the ones who have built a consistent inbound pipeline. Jobs come to them, rather than them chasing jobs.</p>

        <div className="stat-strip">
          <div className="stat-card">
            <div className="stat-num">R0</div>
            <div className="stat-label">Cost to join Lungisa</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">5%</div>
            <div className="stat-label">Commission on success only</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">24h</div>
            <div className="stat-label">Average time to first bid</div>
          </div>
        </div>

        <h2>Why Bidding Platforms Work Better Than Advertising</h2>
        <p>When you advertise, you pay whether you get a job or not. On a bidding platform like Lungisa, you only pay when you win a job and complete it. That means your marketing spend is directly tied to revenue — zero risk.</p>
        <p>More importantly, homeowners who come through a bidding platform are actively looking for a tradesperson right now. They&apos;re not browsing — they have a specific job and they&apos;re ready to hire. The conversion rate is dramatically higher than any form of advertising.</p>

        <div className="highlight-box">
          <p>A plumber bidding on 10 jobs per week at a 30% win rate completes 3 jobs. At an average of R800 per job, that&apos;s R2,400 per week in additional revenue — with a commission cost of R120. That&apos;s a better return than any advertising spend.</p>
        </div>

        <h2>How to Win More Bids on Lungisa</h2>
        <h3>1. Respond fast</h3>
        <p>The first tradesperson to bid on a job gets a significant advantage. Homeowners who receive a bid quickly feel reassured and are more likely to engage with that bidder first. Set up notifications and bid on new jobs within the first hour.</p>

        <h3>2. Write a specific, professional message</h3>
        <p>Bids with a short message explaining your approach win at higher rates than price-only bids. A single sentence — &quot;I&apos;ve replaced this type of fitting many times and carry the parts with me&quot; — builds more trust than any price.</p>

        <h3>3. Get your ID verified</h3>
        <p>Verified tradespeople on Lungisa win bids at nearly double the rate of unverified tradespeople. The verified badge appears on every bid you place. Homeowners actively prefer verified tradespeople — it removes the trust barrier.</p>

        <h3>4. Build your reviews</h3>
        <p>After your first 5 completed jobs, your average star rating becomes your most powerful sales tool. A 4.8-star rating with 8 reviews beats a lower price almost every time. Do good work, complete the job report thoroughly, and the reviews will follow.</p>

        <h3>5. Price competitively but not desperately</h3>
        <p>The lowest bid doesn&apos;t always win. Homeowners are making a judgement call about trust, not just price. A fair market price with a verified badge and a good message will beat an underprice from an unknown tradesperson.</p>

        <h2>Which Trades Are in Highest Demand in Gauteng Right Now?</h2>
        <ul>
          <li><strong>Plumbing</strong> — consistently the highest volume of jobs, year-round demand</li>
          <li><strong>Electrical</strong> — load shedding has increased demand for inverter and solar installations significantly</li>
          <li><strong>Painting</strong> — seasonal peaks in October-March, strong demand for interior and exterior</li>
          <li><strong>General handyman</strong> — high volume of small jobs, good for building a review base quickly</li>
          <li><strong>Roofing and waterproofing</strong> — post-storm demand spikes, higher average job value</li>
        </ul>

        <div className="tip-box">
          <p>💡 <strong>Pro tip:</strong> List your service areas broadly when you start — Sandton, Randburg, Midrand, Fourways. You can narrow down once you understand which areas generate the best jobs for your trade and price point.</p>
        </div>

        <div className="cta-box">
          <h3>Start Finding Work in Your Area</h3>
          <p>Join free. Bid on jobs near you. Pay 5% only when you complete a paid job. No subscriptions, no listing fees.</p>
          <Link href="/auth"><span className="cta-btn">Join as a tradesperson →</span></Link>
        </div>

        <h2>Frequently Asked Questions</h2>
        <h3>How much does it cost to join Lungisa as a tradesperson?</h3>
        <p>Nothing. Joining is free, bidding is free. You pay a 5% commission only when you complete a paid job. If you don&apos;t win a job, you pay nothing.</p>

        <h3>How many jobs can I bid on?</h3>
        <p>There&apos;s no limit on bids. You can bid on as many open jobs in your trade and service area as you want.</p>

        <h3>How do I get paid?</h3>
        <p>Payment is held in escrow when the homeowner confirms your bid. Once you complete the job and the homeowner confirms, payment is released to your bank account within 1-2 business days.</p>

        <div className="related">
          <div className="related-title">Related articles</div>
          <div className="related-grid">
            <Link href="/blog/home-repairs-gauteng">
              <div className="related-card">
                <div className="related-card-title">💰 Home Repair Costs in Gauteng 2026 — Know Your Market</div>
              </div>
            </Link>
            <Link href="/blog/how-escrow-protects-homeowners">
              <div className="related-card">
                <div className="related-card-title">🔒 How Escrow Payment Protects Both Parties</div>
              </div>
            </Link>
          </div>
        </div>
      </article>

      <footer className="footer">
        © 2026 Lungisa · TVM Capital Link Pty Ltd · Johannesburg, South Africa
      </footer>
    </>
  )
}