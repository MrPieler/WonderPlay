import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GAMES } from './games/registry'
import { LandingPage } from './routes/LandingPage'
import { GameShell, ThemeProvider } from '../shell'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <GameShell>
                <LandingPage />
              </GameShell>
            }
          />
          {GAMES.map((game) => (
            <Route
              key={game.id}
              path={`/${game.path}`}
              element={
                <GameShell>
                  <game.component />
                </GameShell>
              }
            />
          ))}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
