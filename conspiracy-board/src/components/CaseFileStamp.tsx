import { motion } from 'framer-motion'

interface CaseFileStampProps {
  caseFileNumber: string
  classificationLevel: string
  delay?: number
}

export function CaseFileStamp({
  caseFileNumber,
  classificationLevel,
  delay = 0,
}: CaseFileStampProps) {
  return (
    <motion.div
      className="absolute bottom-4 right-4 md:bottom-8 md:right-8 select-none pointer-events-none z-20"
      initial={{ opacity: 0, scale: 1.5, rotate: -12 }}
      animate={{ opacity: 0.7, scale: 1, rotate: -12 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      data-testid="case-file-stamp"
      aria-hidden="true"
    >
      <div className="font-typewriter text-right">
        <div className="text-landing-accent text-lg md:text-2xl font-bold border-2 border-landing-accent px-3 py-1 inline-block mb-1">
          {classificationLevel}
        </div>
        <div className="text-landing-accent/60 text-xs md:text-sm tracking-wider">
          {caseFileNumber}
        </div>
      </div>
    </motion.div>
  )
}
