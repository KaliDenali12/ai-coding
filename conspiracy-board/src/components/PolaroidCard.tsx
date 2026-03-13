import { motion } from 'framer-motion'
import type { ConspiracyNode } from '@/types/conspiracy.ts'
import { getFontClass } from '@/lib/fonts.ts'

interface PolaroidCardProps {
  node: ConspiracyNode
  isFlipped: boolean
  onClick: () => void
  rotation: number
  delay?: number
  animate?: boolean
}

export function PolaroidCard({
  node,
  isFlipped,
  onClick,
  rotation,
  delay = 0,
  animate = true,
}: PolaroidCardProps) {
  const fontClass = getFontClass(node.font_category)

  const cardContent = (
    <div
      className="perspective cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 rounded-sm"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${node.title} - click to ${isFlipped ? 'close' : 'read briefing'}`}
      data-testid="polaroid-card"
    >
      <div
        className="preserve-3d transition-transform duration-[350ms] relative"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Front Face */}
        <div
          className="backface-hidden absolute inset-0 bg-white rounded-sm shadow-lg"
          style={{ transform: 'rotateY(0deg)' }}
          data-testid="polaroid-front"
        >
          {/* Push Pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="w-5 h-5 rounded-full bg-red-700 shadow-md border border-red-900">
              <div className="w-2 h-2 rounded-full bg-red-400 absolute top-0.5 left-0.5" />
            </div>
          </div>

          {/* Photo Area */}
          <div className="bg-polaroid-cream m-2 mb-0 p-4 flex flex-col items-center justify-center aspect-square">
            <span className="text-5xl mb-2" role="img" aria-label={node.title}>
              {node.emoji}
            </span>
            <span
              className={`${fontClass} text-center text-sm leading-tight text-gray-800 line-clamp-2`}
            >
              {node.teaser}
            </span>
          </div>

          {/* Title Strip */}
          <div className="px-3 py-2 text-center">
            <span className="font-handwritten text-lg text-gray-900 leading-tight line-clamp-1">
              {node.title}
            </span>
          </div>
        </div>

        {/* Back Face */}
        <div
          className="backface-hidden absolute inset-0 bg-polaroid-cream rounded-sm shadow-lg p-4 overflow-y-auto"
          style={{ transform: 'rotateY(180deg)' }}
          data-testid="polaroid-back"
        >
          {/* Faint ruled lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, #999 24px)',
              backgroundPosition: '0 8px',
            }}
          />

          {/* Briefing Content */}
          <div className="relative z-10">
            <p className="font-typewriter text-xs text-red-800 mb-2 uppercase tracking-wider">
              {node.title} — Classified Briefing
            </p>
            <div className="font-body text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {node.briefing}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!animate) {
    return (
      <div
        style={{ transform: `rotate(${rotation}deg)` }}
        className="w-[150px] h-[210px] md:w-[200px] md:h-[280px]"
      >
        {cardContent}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20, rotate: rotation }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: rotation }}
      transition={{
        delay,
        duration: 0.35,
        type: 'spring',
        stiffness: 280,
        damping: 22,
      }}
      whileHover={{ scale: 1.03, zIndex: 50 }}
      whileTap={{ scale: 0.97 }}
      className="w-[150px] h-[210px] md:w-[200px] md:h-[280px]"
    >
      {cardContent}
    </motion.div>
  )
}
