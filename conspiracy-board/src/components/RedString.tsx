import { useRef, useEffect, useState } from 'react'

interface RedStringProps {
  path: string
  delay?: number
  duration?: number
  animate?: boolean
}

export function RedString({
  path,
  delay = 0,
  duration = 800,
  animate = true,
}: RedStringProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState(0)
  const [isVisible, setIsVisible] = useState(!animate)

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [path])

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [animate, delay])

  return (
    <path
      ref={pathRef}
      d={path}
      fill="none"
      stroke="var(--color-string-red)"
      strokeWidth={2.5}
      strokeLinecap="round"
      opacity={isVisible ? 1 : 0}
      strokeDasharray={pathLength || 1000}
      strokeDashoffset={isVisible ? 0 : pathLength || 1000}
      style={
        isVisible && animate
          ? {
              transition: `stroke-dashoffset ${duration}ms ease-in-out`,
            }
          : undefined
      }
      data-testid="red-string"
    />
  )
}
