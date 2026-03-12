import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
}

export function LoadingScreen({ onTimeout }: LoadingScreenProps) {
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
    const timer = setTimeout(() => setShowStamp(true), 300)
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
      transition={{ duration: 0.4 }}
      data-testid="loading-screen"
      role="status"
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
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
          >
            <motion.div
              className="h-full bg-landing-bg rounded-sm"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.2 }}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          data-testid="loading-message"
          aria-live="polite"
        >
          {getMessage()}
        </motion.p>
      </AnimatePresence>

      {/* Blinking cursor */}
      <motion.span
        className="inline-block w-2 h-5 bg-landing-accent mt-4"
        aria-hidden="true"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  )
}
