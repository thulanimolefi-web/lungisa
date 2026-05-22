import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — Home Repair Tips & Guides for Gauteng Homeowners',
  description: 'Expert advice on finding tradespeople, home repair costs, and how to get the best price for plumbing, electrical, painting and more in Johannesburg and Gauteng.',
  openGraph: {
    title:       'Lungisa Blog — Home Repair Guides for Gauteng',
    description: 'Tips on finding vetted plumbers, electricians and tradespeople in Johannesburg. Get the best price safely.',
    url:         'https://www.lungiza.co.za/blog',
  },
}

const posts = [
  {
    slug:     'find-plumber-johannesburg',
    title:    'How to Find a Reliable Plumber in Johannesburg (Without Getting Burned)',
    excerpt:  'Finding a trustworthy plumber in Johannesburg can feel like a gamble. Here\'s exactly what to look for — and how to make sure you never pay upfront again.',
    date:     '15 May 2026',
    readTime: '5 min read',
    category: 'Plumbing',
    emoji:    '🔧',
  },
  {
    slug:     'electrician-sandton',
    title:    'What to Look for When Hiring an Electrician in Sandton and Fourways',
    excerpt:  'Electrical work done wrong is dangerous. Before you hire anyone, here\'s the checklist every Sandton homeowner should use.',
    date:     '12 May 2026',
    readTime: '4 min read',
    category: 'Electrical',
    emoji:    '⚡',
  },
  {
    slug:     'home-repairs-gauteng',
    title:    'Home Repair Costs in Gauteng: What You Should Actually Be Paying in 2026',
    excerpt:  'Are you being overcharged? We analysed hundreds of home repair jobs across Johannesburg, Pretoria and Sandton to give you real benchmark prices.',
    date:     '8 May 2026',
    readTime: '7 min read',
    category: 'Costs & Pricing',
    emoji:    '💰',
  },
  {
    slug:     'how-escrow-protects-homeowners',
    title:    'Why You Should Never Pay a Tradesperson Upfront — And What to Do Instead',
    excerpt:  'Paying upfront is the number one mistake SA homeowners make. Escrow payment protects both you and the tradesperson. Here\'s how it works.',
    date:     '3 May 2026',
    readTime: '4 min read',
    category: 'Safety & Protection',
    emoji:    '🔒',
  },
  {
    slug:     'grow-your-trade-business-south-africa',
    title:    'How Gauteng Tradespeople Are Growing Their Business Without Advertising',
    excerpt:  'Cold calling and word of mouth only go so far. Here\'s how plumbers, electricians and painters in Johannesburg are finding consistent work in 2026.',
    date:     '28 April 2026',
    readTime: '5 min read',
    category: 'For Tradespeople',
    emoji:    '📈',
  },
]

export default function BlogIndex() {
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
    .hero{background:var(--charcoal);padding:60px 40px;text-align:center}
    .hero-tag{display:inline-block;background:rgba(196,89,58,.2);border:1px solid rgba(196,89,58,.3);border-radius:100px;padding:5px 16px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E07A5F;margin-bottom:16px}
    .hero-h{font-family:'Bebas Neue',sans-serif;font-size:52px;letter-spacing:1px;color:#F5F0E8;margin-bottom:12px}
    .hero-sub{font-size:17px;color:rgba(245,240,232,.5);max-width:540px;margin:0 auto;line-height:1.6}
    .main{max-width:900px;margin:0 auto;padding:60px 40px}
    .posts-grid{display:grid;gap:20px}
    .post-card{background:#fff;border-radius:12px;border:1px solid var(--cream-d);padding:28px;display:flex;gap:20px;align-items:flex-start;transition:border-color .2s,box-shadow .2s;cursor:pointer}
    .post-card:hover{border-color:var(--terra);box-shadow:0 4px 20px rgba(0,0,0,.06)}
    .post-emoji{width:56px;height:56px;border-radius:12px;background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
    .post-cat{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--terra);margin-bottom:6px}
    .post-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:var(--charcoal);margin-bottom:8px;line-height:1.3}
    .post-excerpt{font-size:14px;color:var(--charcoal-l);line-height:1.6;margin-bottom:12px}
    .post-meta{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:rgba(44,44,40,.4);display:flex;gap:12px}
    .post-cta{display:inline-flex;align-items:center;gap:6px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--terra);margin-top:10px}
    .bottom-cta{background:var(--terra);padding:60px 40px;text-align:center;margin-top:40px}
    .bottom-h{font-family:'Bebas Neue',sans-serif;font-size:44px;color:#fff;letter-spacing:1px;margin-bottom:10px}
    .bottom-sub{font-size:16px;color:rgba(255,255,255,.7);margin-bottom:24px}
    .bottom-btn{background:#fff;color:var(--terra);border:none;padding:14px 32px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer}
    .footer{background:var(--charcoal);padding:24px 40px;text-align:center;font-size:12px;color:rgba(245,240,232,.3)}
    @media(max-width:600px){.main{padding:40px 20px}.hero{padding:40px 20px}.hero-h{font-size:36px}.post-card{flex-direction:column}.nav{padding:0 20px}}
  `

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
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

      {/* HERO */}
      <div className="hero">
        <div className="hero-tag">Lungisa Blog</div>
        <h1 className="hero-h">Home Repair Guides<br/>for Gauteng</h1>
        <p className="hero-sub">
          Expert advice on finding tradespeople, understanding costs, and protecting yourself when getting work done at home.
        </p>
      </div>

      {/* POSTS */}
      <main className="main">
        <div className="posts-grid">
          {posts.map(post=>(
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="post-card">
                <div className="post-emoji">{post.emoji}</div>
                <div style={{flex:1}}>
                  <div className="post-cat">{post.category}</div>
                  <h2 className="post-title">{post.title}</h2>
                  <p className="post-excerpt">{post.excerpt}</p>
                  <div className="post-meta">
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                  <div className="post-cta">Read article →</div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      {/* BOTTOM CTA */}
      <div className="bottom-cta">
        <h2 className="bottom-h">Ready to find a tradesperson?</h2>
        <p className="bottom-sub">Post your job free. Get bids within hours. Pay safely in escrow.</p>
        <Link href="/auth"><button className="bottom-btn">Post a job — it&apos;s free</button></Link>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        © 2026 Lungisa · TVM Capital Link Pty Ltd · Johannesburg, South Africa
      </footer>
    </>
  )
}