import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ERROR_MESSAGES } from '@/lib/constants.ts'

interface ErrorScreenProps {
  onRetry: () => void
}

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  const errorVariant = useMemo(
    () => ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)],
    [],
  )

  return (
    <motion.div
      className="h-full w-full bg-landing-bg flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="error-screen"
    >
      {/* Stamp/Heading */}
      {errorVariant.style === 'redacted' && (
        <motion.h1
          className="animate-stamp font-typewriter text-4xl md:text-6xl text-landing-accent/80 border-4 border-landing-accent/80 px-6 py-2 mb-8 select-none"
        >
          {errorVariant.heading}
        </motion.h1>
      )}

      {errorVariant.style === 'flickering' && (
        <motion.h1
          className="font-typewriter text-3xl md:text-5xl text-landing-accent mb-8"
          animate={{ opacity: [1, 0.3, 1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {errorVariant.heading}
        </motion.h1>
      )}

      {errorVariant.style === 'classified' && (
        <div className="mb-8">
          <h1 className="font-typewriter text-3xl md:text-5xl text-white/80 mb-2">
            {errorVariant.heading}
          </h1>
          <div className="flex gap-2 justify-center mb-2" aria-hidden="true">
            {[0.8, 1, 0.6, 0.9].map((w, i) => (
              <div
                key={i}
                className="h-3 bg-white/20 rounded-sm"
                style={{ width: `${w * 60}px` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Message */}
      <motion.p
        className="font-typewriter text-white/70 text-center text-sm md:text-lg max-w-md mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        role="alert"
        data-testid="error-message"
      >
        {errorVariant.message}
      </motion.p>

      {/* Retry Button */}
      <motion.button
        onClick={onRetry}
        className="font-typewriter text-lg px-8 py-3 rounded-lg bg-landing-accent text-white uppercase tracking-wider hover:bg-landing-accent/80 focus:outline-none focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid="retry-button"
      >
        Try Again
      </motion.button>
    </motion.div>
  )
}
