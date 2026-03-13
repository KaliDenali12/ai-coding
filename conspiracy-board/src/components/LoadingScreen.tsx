import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LOADING_MESSAGES,
  SLOW_LOADING_MESSAGES,
  TIMEOUT_MESSAGE,
  LOADING_MESSAGE_INTERVAL_MS,
  SLOW_THRESHOLD_MS,
  TIMEOUT_THRESHOLD_MS,
  FAIL_THRESHOLD_MS,
} from '@/lib/constants.ts'

interface LoadingScreenProps {
  onTimeout: () => void
  onCancel: () => void
}

export function LoadingScreen({ onTimeout, onCancel }: LoadingScreenProps) {
  const prefersReducedMotion = useReducedMotion()
  const [messageIndex, setMessageIndex] = useState(0)
  const [showStamp, setShowStamp] = useState(false)
  const [phase, setPhase] = useState<'normal' | 'slow' | 'timeout'>('normal')
  const startTimeRef = useRef(Date.now())
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  // Cycle messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => prev + 1)
    }, LOADING_MESSAGE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  // Show stamp after brief delay
  useEffect(() => {
    const timer = setTimeout(() => setShowStamp(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Track elapsed time for phase transitions
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      if (elapsed >= FAIL_THRESHOLD_MS) {
        onTimeoutRef.current()
      } else if (elapsed >= TIMEOUT_THRESHOLD_MS) {
        setPhase('timeout')
      } else if (elapsed >= SLOW_THRESHOLD_MS) {
        setPhase('slow')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getMessage = useCallback(() => {
    if (phase === 'timeout') return TIMEOUT_MESSAGE
    if (phase === 'slow') {
      return SLOW_LOADING_MESSAGES[messageIndex % SLOW_LOADING_MESSAGES.length]
    }
    return LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length]
  }, [phase, messageIndex])

  return (
    <motion.div
      className="h-full w-full bg-landing-bg flex flex-col items-center justify-center px-4 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-testid="loading-screen"
      role="status"
      aria-busy="true"
      aria-label="Loading investigation results"
    >
      {/* CLASSIFIED Stamp */}
      {showStamp && (
        <motion.div
          className="animate-stamp font-typewriter text-5xl md:text-7xl text-landing-accent/80 border-4 border-landing-accent/80 px-6 py-2 mb-10 select-none"
          data-testid="classified-stamp"
          aria-hidden="true"
        >
          CLASSIFIED
        </motion.div>
      )}

      {/* Redacted lines */}
      <div className="flex flex-col gap-2 mb-8 w-64" data-testid="redacted-lines" aria-hidden="true">
        {[0.8, 1, 0.6, 0.9, 0.5].map((width, i) => (
          <motion.div
            key={i}
            className="h-3 bg-white/20 rounded-sm"
            style={{ width: `${width * 100}%` }}
            initial={prefersReducedMotion ? false : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 + i * 0.1, duration: 0.2 }}
          >
            <motion.div
              className="h-full bg-landing-bg rounded-sm"
              initial={prefersReducedMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.4 + i * 0.1, duration: 0.15 }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Cycling status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={getMessage()}
          className="font-typewriter text-white/70 text-sm md:text-base tracking-wider"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          data-testid="loading-message"
          aria-live="polite"
        >
          {getMessage()}
        </motion.p>
      </AnimatePresence>

      {/* Blinking cursor (static when reduced motion preferred) */}
      <motion.span
        className="inline-block w-2 h-5 bg-landing-accent mt-4"
        aria-hidden="true"
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [1, 0, 1] }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, repeat: Infinity }}
      />

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="mt-8 font-typewriter text-sm px-6 py-2 rounded-lg border border-white/20 text-white/50 hover:text-white hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg transition-all"
        data-testid="cancel-button"
      >
        Cancel
      </button>
    </motion.div>
  )
}
