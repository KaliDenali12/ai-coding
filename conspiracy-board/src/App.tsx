import { useState, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LandingScreen } from '@/components/LandingScreen.tsx'
import { LoadingScreen } from '@/components/LoadingScreen.tsx'
import { Corkboard } from '@/components/Corkboard.tsx'
import { ErrorScreen } from '@/components/ErrorScreen.tsx'
import { generateConspiracy, ApiError } from '@/lib/api.ts'
import type { ConspiracyChain } from '@/types/conspiracy.ts'

type AppScreen = 'landing' | 'loading' | 'board' | 'error'

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [boardData, setBoardData] = useState<ConspiracyChain | null>(null)
  const [lastInputs, setLastInputs] = useState<{ a: string; b: string }>({ a: '', b: '' })
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(async (conceptA: string, conceptB: string) => {
    setLastInputs({ a: conceptA, b: conceptB })
    setScreen('loading')

    // Cancel any in-flight request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      const data = await generateConspiracy({ conceptA, conceptB }, abortControllerRef.current.signal)
      setBoardData(data)
      setScreen('board')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      if (error instanceof ApiError) {
        console.error(`Generation failed: API returned ${error.statusCode} — ${error.message}`)
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Generation failed: ${message}`)
      }
      setScreen('error')
    }
  }, [])

  const handleTimeout = useCallback(() => {
    abortControllerRef.current?.abort()
    setScreen('error')
  }, [])

  const handleRetry = useCallback(() => {
    setScreen('landing')
  }, [])

  const handleNewInvestigation = useCallback(() => {
    setBoardData(null)
    setLastInputs({ a: '', b: '' })
    setScreen('landing')
  }, [])

  return (
    <main className="h-full w-full" data-testid="app-root">
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <LandingScreen
            key="landing"
            onSubmit={handleSubmit}
            initialA={lastInputs.a}
            initialB={lastInputs.b}
          />
        )}

        {screen === 'loading' && (
          <LoadingScreen key="loading" onTimeout={handleTimeout} />
        )}

        {screen === 'board' && boardData && (
          <Corkboard
            key="board"
            data={boardData}
            onNewInvestigation={handleNewInvestigation}
          />
        )}

        {screen === 'error' && (
          <ErrorScreen
            key="error"
            onRetry={handleRetry}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
