import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Home Repair Costs in Gauteng 2026 — What You Should Actually Be Paying',
  description: 'Are you being overcharged? Real benchmark prices for plumbing, electrical, painting, roofing and more across Johannesburg, Sandton, Pretoria and Gauteng in 2026.',
  keywords: ['home repair costs Johannesburg', 'plumber price Gauteng', 'electrician cost JHB', 'painter price Johannesburg', 'home repair prices South Africa 2026'],
  openGraph: {
    title:       'Home Repair Costs in Gauteng 2026 — Real Benchmark Prices',
    description: 'Real prices for plumbing, electrical, painting and more across Gauteng. Stop getting overcharged.',
    url:         'https://www.lungiza.co.za/blog/home-repairs-gauteng',
    type:        'article',
  },
}

export default function HomeRepairsGauteng() {
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
    li{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:6px}
    .tip-box{background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .tip-box p{margin:0;color:#1a6e35}
    .cost-table{width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--cream-d)}
    .cost-table th{background:var(--charcoal);color:#F5F0E8;padding:12px 16px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
    .cost-table td{padding:12px 16px;font-size:14px;border-bottom:1px solid var(--cream-d);color:var(--charcoal-l)}
    .cost-table tr:last-child td{border-bottom:none}
    .area-table{width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--cream-d)}
    .area-table th{background:var(--terra);color:#fff;padding:12px 16px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
    .area-table td{padding:12px 16px;font-size:14px;border-bottom:1px solid var(--cream-d);color:var(--charcoal-l)}
    .area-table tr:last-child td{border-bottom:none}
    .cta-box{background:var(--terra);border-radius:12px;padding:28px;margin:36px 0;text-align:center}
    .cta-box h3{color:#fff;font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:8px}
    .cta-box p{color:rgba(255,255,255,.8);margin-bottom:16px}
    .cta-btn{background:#fff;color:var(--terra);border:none;padding:12px 28px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;display:inline-block}
    .related{margin-top:48px;padding-top:32px;border-top:1px solid var(--cream-d)}
    .related-title{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:16px}
    .related-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .related-card{background:#fff;border:1px solid var(--cream-d);border-radius:8px;padding:16px;transition:border-color .2s}
    .related-card:hover{border-color:var(--terra)}
    .related-card-title{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--charcoal);line-height:1.4}
    .footer{background:var(--charcoal);padding:24px 40px;text-align:center;font-size:12px;color:rgba(245,240,232,.3);margin-top:60px}
    @media(max-width:600px){.article-wrap{padding:40px 20px}.related-grid{grid-template-columns:1fr}.nav{padding:0 20px}}
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
        <Link href="/auth"><button className="nav-cta">Post a job free</button></Link>
      </nav>

      <article className="article-wrap">
        <div className="breadcrumb">
          <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › Costs & Pricing
        </div>

        <div className="article-cat">💰 Costs & Pricing</div>
        <h1>Home Repair Costs in Gauteng: What You Should Actually Be Paying in 2026</h1>
        <div className="article-meta">
          <span>8 May 2026</span><span>·</span><span>7 min read</span><span>·</span><span>Johannesburg, Pretoria, Gauteng</span>
        </div>

        <p className="article-intro">
          Most Gauteng homeowners have no idea what a fair price for home repairs looks like. That information gap is exactly why tradespeople can charge whatever they want. Here are the real benchmark prices — based on actual jobs completed across Johannesburg, Pretoria and surrounding areas.
        </p>

        <h2>Why Prices Vary So Much Across Gauteng</h2>
        <p>Home repair costs in Gauteng vary by area, urgency, and how many quotes you get. A plumber in Sandton typically charges 25-40% more than the same job in Soweto or Roodepoort — not because the work is harder, but because the market allows it. Emergency call-outs add another 30-50% regardless of area.</p>
        <p>The single most effective way to get a fair price is to get at least 3 competitive quotes. When tradespeople know they&apos;re competing, prices drop.</p>

        <div className="tip-box">
          <p>💡 On Lungisa, homeowners who receive 3 or more bids pay an average of 23% less than the first quote they received.</p>
        </div>

        <h2>Plumbing Costs in Gauteng 2026</h2>
        <table className="cost-table">
          <thead><tr><th>Job</th><th>Low</th><th>Average</th><th>High</th></tr></thead>
          <tbody>
            <tr><td>Burst pipe repair</td><td>R400</td><td>R650</td><td>R1,200</td></tr>
            <tr><td>Blocked drain</td><td>R350</td><td>R550</td><td>R900</td></tr>
            <tr><td>Tap replacement</td><td>R300</td><td>R450</td><td>R800</td></tr>
            <tr><td>Toilet replacement</td><td>R1,200</td><td>R1,800</td><td>R3,000</td></tr>
            <tr><td>Geyser replacement (incl. installation)</td><td>R3,500</td><td>R4,500</td><td>R7,000</td></tr>
            <tr><td>Leak detection</td><td>R500</td><td>R800</td><td>R1,500</td></tr>
          </tbody>
        </table>

        <h2>Electrical Costs in Gauteng 2026</h2>
        <table className="cost-table">
          <thead><tr><th>Job</th><th>Low</th><th>Average</th><th>High</th></tr></thead>
          <tbody>
            <tr><td>New plug point</td><td>R400</td><td>R650</td><td>R1,000</td></tr>
            <tr><td>DB board replacement</td><td>R2,500</td><td>R3,500</td><td>R5,500</td></tr>
            <tr><td>Certificate of Compliance</td><td>R800</td><td>R1,200</td><td>R2,000</td></tr>
            <tr><td>Fault finding</td><td>R500</td><td>R750</td><td>R1,200</td></tr>
            <tr><td>Inverter installation</td><td>R5,000</td><td>R8,000</td><td>R15,000</td></tr>
            <tr><td>Solar panel installation (5kW)</td><td>R45,000</td><td>R65,000</td><td>R90,000</td></tr>
          </tbody>
        </table>

        <h2>Painting Costs in Gauteng 2026</h2>
        <table className="cost-table">
          <thead><tr><th>Job</th><th>Low</th><th>Average</th><th>High</th></tr></thead>
          <tbody>
            <tr><td>Single room interior (paint supplied)</td><td>R1,800</td><td>R2,500</td><td>R4,000</td></tr>
            <tr><td>Full house interior (3 bed)</td><td>R8,000</td><td>R14,000</td><td>R22,000</td></tr>
            <tr><td>Exterior single storey</td><td>R12,000</td><td>R18,000</td><td>R28,000</td></tr>
            <tr><td>Waterproofing (per m²)</td><td>R80</td><td>R120</td><td>R200</td></tr>
          </tbody>
        </table>

        <h2>General Handyman Costs in Gauteng 2026</h2>
        <table className="cost-table">
          <thead><tr><th>Job</th><th>Low</th><th>Average</th><th>High</th></tr></thead>
          <tbody>
            <tr><td>Door repair / rehang</td><td>R350</td><td>R600</td><td>R1,200</td></tr>
            <tr><td>TV mounting</td><td>R450</td><td>R700</td><td>R1,200</td></tr>
            <tr><td>Tile replacement (per tile)</td><td>R200</td><td>R350</td><td>R600</td></tr>
            <tr><td>Gate motor installation</td><td>R3,500</td><td>R5,000</td><td>R8,000</td></tr>
            <tr><td>Roof leak repair</td><td>R800</td><td>R2,000</td><td>R5,000</td></tr>
          </tbody>
        </table>

        <h2>Price Differences by Area</h2>
        <table className="area-table">
          <thead><tr><th>Area</th><th>Price premium vs Gauteng average</th></tr></thead>
          <tbody>
            <tr><td>Sandton / Fourways</td><td>+25% to +40%</td></tr>
            <tr><td>Midrand / Centurion</td><td>+10% to +20%</td></tr>
            <tr><td>Randburg / Roodepoort</td><td>Average</td></tr>
            <tr><td>Soweto / Johannesburg South</td><td>-10% to -20%</td></tr>
            <tr><td>Pretoria / Tshwane</td><td>-5% to +10%</td></tr>
            <tr><td>East Rand (Boksburg, Benoni)</td><td>-10% to -15%</td></tr>
          </tbody>
        </table>

        <div className="cta-box">
          <h3>Get Competitive Quotes for Your Job</h3>
          <p>Post your job on Lungisa and let vetted tradespeople bid. See exactly what the market rate is for your specific job in your area.</p>
          <Link href="/auth"><span className="cta-btn">Post your job free →</span></Link>
        </div>

        <h2>How to Make Sure You Pay a Fair Price</h2>
        <ol>
          <li><strong>Always get at least 3 quotes</strong> — the spread between the cheapest and most expensive is often 40-60%</li>
          <li><strong>Use a competitive platform</strong> — when tradespeople bid against each other, prices are naturally lower</li>
          <li><strong>Negotiate</strong> — most tradespeople price with room to negotiate, especially for larger jobs</li>
          <li><strong>Be specific about the job</strong> — vague descriptions lead to inflated quotes to cover unknowns</li>
          <li><strong>Check what&apos;s included</strong> — does the quote include materials, call-out fee, and VAT?</li>
        </ol>

        <div className="related">
          <div className="related-title">Related articles</div>
          <div className="related-grid">
            <Link href="/blog/find-plumber-johannesburg">
              <div className="related-card">
                <div className="related-card-title">🔧 How to Find a Reliable Plumber in Johannesburg</div>
              </div>
            </Link>
            <Link href="/blog/how-escrow-protects-homeowners">
              <div className="related-card">
                <div className="related-card-title">🔒 Why You Should Never Pay a Tradesperson Upfront</div>
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