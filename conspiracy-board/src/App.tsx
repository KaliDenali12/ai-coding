import { useState } from 'react'

type AppScreen = 'landing' | 'loading' | 'board' | 'error'

function App() {
  const [_screen, _setScreen] = useState<AppScreen>('landing')

  return (
    <div className="h-full w-full bg-landing-bg text-white font-typewriter">
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl text-center">"It's All Connected."</h1>
      </div>
    </div>
  )
}

export default App
