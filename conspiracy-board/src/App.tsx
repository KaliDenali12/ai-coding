import { useState, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LandingScreen } from '@/components/LandingScreen.tsx'
import { LoadingScreen } from '@/components/LoadingScreen.tsx'
import { Corkboard } from '@/components/Corkboard.tsx'
import { ErrorScreen } from '@/components/ErrorScreen.tsx'
import { generateConspiracy, ApiError } from '@/lib/api.ts'
import type { ConspiracyChain } from '@/types/conspiracy.ts'

type AppScreen = 'landing' | 'loading' | 'board' | 'error'
type ErrorType = 'timeout' | 'rate_limited' | 'generic'

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [boardData, setBoardData] = useState<ConspiracyChain | null>(null)
  const [lastInputs, setLastInputs] = useState<{ a: string; b: string }>({ a: '', b: '' })
  const [errorType, setErrorType] = useState<ErrorType>('generic')
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
        const rid = error.requestId ? ` [requestId: ${error.requestId}]` : ''
        console.error(`Generation failed: API returned ${error.statusCode} — ${error.message}${rid}`)
        setErrorType(error.statusCode === 429 ? 'rate_limited' : 'generic')
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Generation failed: ${message}`)
        setErrorType('generic')
      }
      setScreen('error')
    }
  }, [])

  const handleTimeout = useCallback(() => {
    abortControllerRef.current?.abort()
    setErrorType('timeout')
    setScreen('error')
  }, [])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setScreen('landing')
  }, [])

  const handleRetry = useCallback(() => {
    setBoardData(null)
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
          <LoadingScreen key="loading" onTimeout={handleTimeout} onCancel={handleCancel} />
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
            errorType={errorType}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
