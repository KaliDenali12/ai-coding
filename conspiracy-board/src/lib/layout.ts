export interface CardPosition {
  x: number
  y: number
  rotation: number
}

export interface LayoutConfig {
  viewportWidth: number
  viewportHeight: number
  cardWidth: number
  cardHeight: number
  cardCount: number
  isMobile: boolean
}

// Seeded random for deterministic layouts per board
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function calculateCardPositions(config: LayoutConfig, seed = 42): CardPosition[] {
  const { viewportWidth, viewportHeight, cardWidth, cardHeight, cardCount, isMobile } = config
  const random = seededRandom(seed)
  const positions: CardPosition[] = []

  const padding = isMobile ? 20 : 40
  const usableWidth = viewportWidth - cardWidth - padding * 2
  const usableHeight = viewportHeight - cardHeight - padding * 2

  for (let i = 0; i < cardCount; i++) {
    const progress = cardCount > 1 ? i / (cardCount - 1) : 0.5

    let x: number
    let y: number

    if (isMobile) {
      // Top-to-bottom flow with horizontal variation
      y = padding + progress * usableHeight
      const centerX = viewportWidth / 2 - cardWidth / 2
      const horizontalJitter = (random() - 0.5) * usableWidth * 0.4
      x = centerX + horizontalJitter
    } else {
      // Left-to-right flow with vertical zigzag
      x = padding + progress * usableWidth
      const centerY = viewportHeight / 2 - cardHeight / 2
      // Alternate above/below center with some randomness
      const zigzagOffset = (i % 2 === 0 ? -1 : 1) * usableHeight * 0.2
      const verticalJitter = (random() - 0.5) * usableHeight * 0.15
      y = centerY + zigzagOffset + verticalJitter
    }

    // Clamp to viewport bounds
    x = Math.max(padding, Math.min(x, viewportWidth - cardWidth - padding))
    y = Math.max(padding, Math.min(y, viewportHeight - cardHeight - padding))

    // Random rotation between -4 and 4 degrees
    const rotation = (random() - 0.5) * 8

    positions.push({ x, y, rotation })
  }

  return positions
}

// Calculate pin position (top-center of card) for string endpoints
export function getPinPosition(card: CardPosition, cardWidth: number): { x: number; y: number } {
  return {
    x: card.x + cardWidth / 2,
    y: card.y + 12, // Pin is near top of card
  }
}

// Generate SVG path for a curved string between two pin positions
export function generateStringPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Control point creates a gentle arc (sag effect like real string)
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  // Sag downward proportional to distance
  const sagAmount = Math.min(distance * 0.15, 60)
  const controlY = midY + sagAmount

  return `M ${from.x} ${from.y} Q ${midX} ${controlY} ${to.x} ${to.y}`
}
