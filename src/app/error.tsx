'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
        <p className="text-white/60 mb-8">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
