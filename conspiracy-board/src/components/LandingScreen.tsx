import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { EXAMPLE_PAIRS } from '@/lib/constants.ts'
import { checkInputs } from '@/lib/blocklist.ts'

interface LandingScreenProps {
  onSubmit: (conceptA: string, conceptB: string) => void
  initialA?: string
  initialB?: string
}

export function LandingScreen({ onSubmit, initialA = '', initialB = '' }: LandingScreenProps) {
  const [conceptA, setConceptA] = useState(initialA)
  const [conceptB, setConceptB] = useState(initialB)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(() => {
    const result = checkInputs(conceptA, conceptB)
    if (!result.valid) {
      setError(result.error ?? 'Invalid input.')
      return
    }
    setError(null)
    onSubmit(conceptA.trim(), conceptB.trim())
  }, [conceptA, conceptB, onSubmit])

  const handleChipClick = useCallback(
    (a: string, b: string) => {
      setConceptA(a)
      setConceptB(b)
      setError(null)
      onSubmit(a, b)
    },
    [onSubmit],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const canSubmit =
    conceptA.trim().length > 0 &&
    conceptB.trim().length > 0 &&
    conceptA.trim().toLowerCase() !== conceptB.trim().toLowerCase()

  return (
    <motion.div
      className="h-full w-full bg-landing-bg flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Headline */}
      <motion.h1
        className="font-typewriter text-4xl md:text-6xl text-white mb-2 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        "It's All Connected."
      </motion.h1>

      <motion.p
        className="font-typewriter text-landing-accent text-sm md:text-base mb-10 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Conspiracy Board
      </motion.p>

      {/* Input Fields */}
      <motion.div
        className="flex flex-col md:flex-row gap-4 w-full max-w-2xl mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <input
          type="text"
          value={conceptA}
          onChange={(e) => {
            setConceptA(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Penguins"
          maxLength={50}
          className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white font-body text-lg placeholder:text-white/30 focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent transition-colors"
          aria-label="First concept"
          data-testid="input-a"
        />

        <span className="text-white/40 font-typewriter text-2xl self-center hidden md:block" aria-hidden="true">
          +
        </span>

        <input
          type="text"
          value={conceptB}
          onChange={(e) => {
            setConceptB(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="IKEA Furniture"
          maxLength={50}
          className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white font-body text-lg placeholder:text-white/30 focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent transition-colors"
          aria-label="Second concept"
          data-testid="input-b"
        />
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.p
          className="text-landing-accent font-typewriter text-sm mb-4 text-center max-w-lg"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          data-testid="error-message"
        >
          {error}
        </motion.p>
      )}

      {/* Submit Button */}
      <motion.button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="font-typewriter text-lg px-8 py-3 rounded-lg bg-landing-accent text-white uppercase tracking-wider transition-all hover:bg-landing-accent/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-landing-accent mb-8"
        whileHover={canSubmit ? { scale: 1.02 } : {}}
        whileTap={canSubmit ? { scale: 0.98 } : {}}
        data-testid="submit-button"
      >
        Uncover the Truth
      </motion.button>

      {/* Example Chips */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {EXAMPLE_PAIRS.map((pair) => (
          <button
            key={`${pair.a}-${pair.b}`}
            onClick={() => handleChipClick(pair.a, pair.b)}
            className="font-body text-sm px-4 py-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-landing-accent/60 hover:bg-landing-accent/10 transition-all"
            data-testid="example-chip"
          >
            {pair.a} + {pair.b}
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}
