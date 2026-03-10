import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">AdFlow AI</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-white/60 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-white/70 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
          AI-powered ad campaigns in minutes
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Ads that run themselves.
          <br />
          <span className="text-white/40">Built for local businesses.</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          AdFlow AI generates, deploys, and optimizes Meta and Google ads for home services,
          dental clinics, real estate, law firms, and more — powered by Claude. Pay only for what you use.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/onboarding"
            className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="#how-it-works"
            className="border border-white/20 px-8 py-3 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Three steps to live ads</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Tell us about your business',
              desc: 'Enter your name, location, and niche. We handle the rest.',
            },
            {
              step: '02',
              title: 'AI writes your ads',
              desc: 'Claude generates high-converting copy tailored to your niche.',
            },
            {
              step: '03',
              title: 'Deploy to Meta or Google',
              desc: 'One click pushes your campaign live with precise local targeting.',
            },
          ].map((f) => (
            <div key={f.step} className="border border-white/10 rounded-xl p-6">
              <div className="text-white/30 text-sm font-mono mb-3">{f.step}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-8 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Simple, usage-based pricing</h2>
        <p className="text-white/50 mb-10">No subscriptions. Pay per action.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { action: 'Ad Generated', cost: '$0.50', desc: '1 credit' },
            { action: 'Ad Deployed', cost: '$2.50', desc: '5 credits' },
            { action: 'Lead Outreach', cost: '$1.00', desc: '2 credits' },
          ].map((p) => (
            <div key={p.action} className="border border-white/10 rounded-xl p-6">
              <div className="text-2xl font-bold mb-1">{p.cost}</div>
              <div className="text-white/70 text-sm font-medium mb-1">{p.action}</div>
              <div className="text-white/30 text-xs">{p.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-sm mt-6">Credits purchased in bundles via Whop. Never expire.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} AdFlow AI. Built with Claude.
      </footer>
    </main>
  )
}
