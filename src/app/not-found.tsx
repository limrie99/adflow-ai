import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-white/60 text-lg mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-block bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
