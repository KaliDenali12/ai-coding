import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null)
  const [revealComplete, setRevealComplete] = useState(false)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  })

  useEffect(() => {
    function handleResize() {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
  useEffect(() => {
    const totalDuration =
      data.chain.length * STEP_DURATION +
      REVEAL_CARD_DELAY_MS +
      500 // Extra buffer for stamp
    const timer = setTimeout(() => setRevealComplete(true), totalDuration)
    return () => clearTimeout(timer)
  }, [data.chain.length])

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
      transition={{ duration: 0.6 }}
      onClick={handleBoardClick}
      data-testid="corkboard"
    >
      {/* SVG layer for strings */}
      <svg
        className="absolute inset-0 w-full pointer-events-none z-0"
        style={{ height: isMobile ? `${boardHeight}px` : '100%' }}
        data-testid="string-layer"
      >
        {stringPaths.map((path, i) => (
          <RedString
            key={i}
            path={path}
            delay={getStringDelay(i)}
            duration={REVEAL_STRING_DURATION_MS}
            animate={true}
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
            animate={true}
          />
        </div>
      ))}

      {/* Case File Stamp */}
      <CaseFileStamp
        caseFileNumber={data.case_file_number}
        classificationLevel={data.classification_level}
        delay={getCardDelay(data.chain.length - 1) / 1000 + 0.8}
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
            onClick={onNewInvestigation}
            className="font-typewriter text-sm md:text-base px-6 py-2.5 bg-landing-bg/90 text-white border border-white/20 rounded-lg hover:bg-landing-bg hover:border-landing-accent/60 transition-all shadow-lg"
            data-testid="new-investigation-btn"
          >
            New Investigation
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
