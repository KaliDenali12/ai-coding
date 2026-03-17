import { useState, useMemo, useCallback, useEffect, useRef, type RefCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ConspiracyChain } from '@/types/conspiracy.ts'
import { PolaroidCard } from './PolaroidCard.tsx'
import { RedString } from './RedString.tsx'
import { CaseFileStamp } from './CaseFileStamp.tsx'
import {
  calculateCardPositions,
  getPinPosition,
  generateStringPath,
} from '@/lib/layout.ts'
import {
  REVEAL_CARD_DELAY_MS,
  REVEAL_STRING_DURATION_MS,
  REVEAL_CARD_ENTRANCE_MS,
} from '@/lib/constants.ts'

const STEP_DURATION = REVEAL_CARD_ENTRANCE_MS + REVEAL_STRING_DURATION_MS

function getCardDelay(index: number): number {
  return index * STEP_DURATION + REVEAL_CARD_DELAY_MS
}

function getStringDelay(index: number): number {
  return index * STEP_DURATION + REVEAL_CARD_DELAY_MS + REVEAL_CARD_ENTRANCE_MS
}

interface CorkboardProps {
  data: ConspiracyChain
  onNewInvestigation: () => void
}

export function Corkboard({ data, onNewInvestigation }: CorkboardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null)
  const [revealComplete, setRevealComplete] = useState(prefersReducedMotion ?? false)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  })

  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleResize() {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => {
        setViewportSize({ width: window.innerWidth, height: window.innerHeight })
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  }, [])

  const isMobile = viewportSize.width < 768
  const cardWidth = isMobile ? 150 : 200
  const cardHeight = isMobile ? 210 : 280

  // On mobile, we need more height to fit 7 cards vertically
  const boardHeight = isMobile
    ? Math.max(viewportSize.height, cardHeight * 7 + 200)
    : viewportSize.height

  const positions = useMemo(
    () =>
      calculateCardPositions(
        {
          viewportWidth: viewportSize.width,
          viewportHeight: boardHeight,
          cardWidth,
          cardHeight,
          cardCount: data.chain.length,
          isMobile,
        },
        // Use case file number as seed for unique-per-board layout
        data.case_file_number.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
      ),
    [viewportSize, boardHeight, cardWidth, cardHeight, data.chain.length, isMobile, data.case_file_number],
  )

  // Mark reveal complete after all animations finish
  // (reduced-motion users get revealComplete=true from initial state)
  useEffect(() => {
    if (prefersReducedMotion) return
    const totalDuration =
      data.chain.length * STEP_DURATION +
      REVEAL_CARD_DELAY_MS +
      500 // Extra buffer for stamp
    const timer = setTimeout(() => setRevealComplete(true), totalDuration)
    return () => clearTimeout(timer)
  }, [data.chain.length, prefersReducedMotion])

  const handleCardClick = useCallback(
    (index: number) => {
      if (!revealComplete) return
      setFlippedIndex((prev) => (prev === index ? null : index))
    },
    [revealComplete],
  )

  // Click outside cards to unflip
  const handleBoardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-testid="polaroid-card"]')) return
      setFlippedIndex(null)
    },
    [],
  )

  // Auto-focus "New Investigation" button for keyboard users
  const newInvestigationRef: RefCallback<HTMLButtonElement> = useCallback(
    (node) => { node?.focus() },
    [],
  )

  // Escape key to unflip cards
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setFlippedIndex(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Delay (in seconds) for UI elements that appear after the reveal sequence
  const postRevealDelay = prefersReducedMotion
    ? 0
    : (data.chain.length * STEP_DURATION + REVEAL_CARD_DELAY_MS + 500) / 1000

  // Generate string paths between consecutive cards
  const stringPaths = useMemo(() => {
    const paths: string[] = []
    for (let i = 0; i < positions.length - 1; i++) {
      const from = getPinPosition(positions[i], cardWidth)
      const to = getPinPosition(positions[i + 1], cardWidth)
      paths.push(generateStringPath(from, to))
    }
    return paths
  }, [positions, cardWidth])

  return (
    <motion.div
      className="w-full cork-bg cork-vignette relative overflow-x-hidden overflow-y-auto"
      style={{ minHeight: '100%', height: isMobile ? `${boardHeight}px` : '100%' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleBoardClick}
      data-testid="corkboard"
    >
      {/* Top instruction banner — wrapper handles centering, motion.div handles animation */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: postRevealDelay }}
          data-testid="corkboard-banner"
        >
          <p className="font-typewriter text-base md:text-xl text-white tracking-widest drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] bg-landing-bg/70 px-8 py-3 rounded-lg border border-white/15">
            Click each card to declassify the truth.
          </p>
        </motion.div>
      </div>

      {/* "BEGIN INVESTIGATION HERE" arrow pointing down to first card */}
      {positions[0] && (
        <div
          className="absolute z-30 flex flex-col items-center"
          style={{
            left: (positions[0].x ?? 0) + cardWidth / 2,
            top: (positions[0].y ?? 0) - (isMobile ? 50 : 65),
            transform: 'translateX(-50%)',
          }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: postRevealDelay + 0.3 }}
            data-testid="start-here-arrow"
          >
            <span className="font-military text-xs md:text-sm text-white tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] whitespace-nowrap">
              BEGIN INVESTIGATION HERE
            </span>
            <svg width="20" height="24" viewBox="0 0 20 24" className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] mt-1" aria-hidden="true">
              <path d="M10 0 L10 16 M4 12 L10 20 L16 12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* SVG layer for strings */}
      <svg
        className="absolute inset-0 w-full pointer-events-none z-0"
        style={{ height: isMobile ? `${boardHeight}px` : '100%' }}
        data-testid="string-layer"
        aria-hidden="true"
      >
        {stringPaths.map((path, i) => (
          <RedString
            key={i}
            path={path}
            delay={getStringDelay(i)}
            duration={REVEAL_STRING_DURATION_MS}
            animate={!prefersReducedMotion}
          />
        ))}
      </svg>

      {/* Polaroid cards */}
      {data.chain.map((node, i) => (
        <div
          key={i}
          className="absolute z-10"
          style={{
            left: positions[i]?.x ?? 0,
            top: positions[i]?.y ?? 0,
          }}
        >
          <PolaroidCard
            node={node}
            isFlipped={flippedIndex === i}
            onClick={() => handleCardClick(i)}
            rotation={positions[i]?.rotation ?? 0}
            delay={getCardDelay(i) / 1000}
            animate={!prefersReducedMotion}
          />
        </div>
      ))}

      {/* Case File Stamp */}
      <CaseFileStamp
        caseFileNumber={data.case_file_number}
        classificationLevel={data.classification_level}
        delay={prefersReducedMotion ? 0 : getCardDelay(data.chain.length - 1) / 1000 + 0.8}
      />

      {/* New Investigation Button */}
      {revealComplete && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            ref={newInvestigationRef}
            onClick={onNewInvestigation}
            className="font-typewriter text-sm md:text-base px-8 py-3 bg-landing-bg/90 text-white border border-white/20 rounded-lg hover:bg-landing-bg hover:border-landing-accent/60 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-cork transition-all shadow-lg"
            data-testid="new-investigation-btn"
          >
            New Investigation
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
