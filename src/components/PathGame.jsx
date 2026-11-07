import { useState, useEffect, useRef } from 'react'

const DIFFICULTY_CONFIG = {
  facil: { rows: 4, cols: 4, obs: 3, viewTime: 20 },
  medio: { rows: 5, cols: 5, obs: 6, viewTime: 10 },
  dificil: { rows: 6, cols: 6, obs: 10, viewTime: 5 }
}

const TOTAL_ROUNDS = 4

// ALGORITMO BFS: Encuentra el camino más corto actual
const findShortestPath = (rows, cols, start, end, obstacles) => {
  const queue = [[start]]
  const visited = new Set([`${start.r},${start.c}`])
  const isObs = (r, c) => obstacles.some((o) => o.r === r && o.c === c)

  while (queue.length > 0) {
    const path = queue.shift()
    const curr = path[path.length - 1]

    if (curr.r === end.r && curr.c === end.c) return path

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    for (let d of dirs) {
      const nr = curr.r + d[0]
      const nc = curr.c + d[1]
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (!visited.has(`${nr},${nc}`) && !isObs(nr, nc)) {
          visited.add(`${nr},${nc}`)
          queue.push([...path, { r: nr, c: nc }])
        }
      }
    }
  }
  return null // Retorna null si no hay camino posible
}

// GENERADOR INTELIGENTE DE NIVELES
const generateLevel = (difficulty) => {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
  let valid = false
  let start, end, obstacles

  while (!valid) {
    start = { r: Math.floor(Math.random() * cfg.rows), c: Math.floor(Math.random() * cfg.cols) }
    end = { r: Math.floor(Math.random() * cfg.rows), c: Math.floor(Math.random() * cfg.cols) }
    
    // Distanciar inicio y meta (mínimo cruzando la mitad del tablero)
    const dist = Math.abs(start.r - end.r) + Math.abs(start.c - end.c)
    if (dist < Math.floor((cfg.rows + cfg.cols) / 1.5)) continue 

    obstacles = []
    let attempts = 0
    
    // Lógica para bloquear intencionalmente la ruta ideal
    while (obstacles.length < cfg.obs && attempts < 50) {
      attempts++
      const currentPath = findShortestPath(cfg.rows, cfg.cols, start, end, obstacles)
      
      let candidate = null
      if (currentPath && currentPath.length > 2) {
         // Bloquear una casilla aleatoria que esté directamente en el camino más corto
         const blockIndex = Math.floor(Math.random() * (currentPath.length - 2)) + 1
         candidate = currentPath[blockIndex]
      } else {
         // Fallback si no hay ruta (muy raro)
         candidate = { r: Math.floor(Math.random() * cfg.rows), c: Math.floor(Math.random() * cfg.cols) }
      }

      if (!candidate) continue

      const isStartOrEnd = (candidate.r === start.r && candidate.c === start.c) || (candidate.r === end.r && candidate.c === end.c)
      const isDuplicate = obstacles.some((o) => o.r === candidate.r && o.c === candidate.c)
      
      if (!isStartOrEnd && !isDuplicate) {
        obstacles.push(candidate)
        // Revertir si el obstáculo bloqueó el nivel completo (haciéndolo imposible)
        if (!findShortestPath(cfg.rows, cfg.cols, start, end, obstacles)) {
          obstacles.pop()
        }
      }
    }
    
    if (obstacles.length === cfg.obs) valid = true
  }

  return { start, end, obstacles, ...cfg }
}

export default function PathMemoryGame({ difficulty = 'medio', customTime, onFinish, onCancel }) {
  const [round, setRound] = useState(1)
  const [levelData, setLevelData] = useState(null)
  
  const [gameState, setGameState] = useState('memorize') 
  const [countdown, setCountdown] = useState(999) // Evita iniciar en 0 para no saltar la 1ra ronda
  
  const [currentPos, setCurrentPos] = useState({ r: 0, c: 0 })
  const [pathTaken, setPathTaken] = useState([])
  const [feedback, setFeedback] = useState(null)

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const setupRound = () => {
    const newLevel = generateLevel(difficulty)
    setLevelData(newLevel)
    setCurrentPos(newLevel.start)
    setPathTaken([{ ...newLevel.start }])
    const timeToUse = customTime ? parseInt(customTime, 10) : newLevel.viewTime
    setCountdown(timeToUse)
    
    setGameState('memorize')
    setFeedback(null)
  }

  useEffect(() => {
    setupRound()
    startTimeRef.current = Date.now()
  }, [difficulty])

  // Temporizador reparado (espera a que exista nivelData)
  useEffect(() => {
    if (!levelData) return

    let timer
    if (gameState === 'memorize') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
      } else {
        setGameState('play')
      }
    }
    return () => clearTimeout(timer)
  }, [gameState, countdown, levelData])

  const handleCellClick = (r, c) => {
    if (gameState !== 'play' || feedback !== null) return

    const isAdjacent = Math.abs(r - currentPos.r) + Math.abs(c - currentPos.c) === 1
    if (!isAdjacent) return

    const isObstacle = levelData.obstacles.some((o) => o.r === r && o.c === c)
    const isEnd = r === levelData.end.r && c === levelData.end.c

    setCurrentPos({ r, c })
    setPathTaken((prev) => [...prev, { r, c }])

    if (isObstacle) {
      const errorEntry = {
        item: round,
        selected: `Casilla [${r + 1}, ${c + 1}]`,
        expected: 'Ruta libre',
        details: 'Chocó con un obstáculo oculto'
      }
      setErrorLogs((prev) => [...prev, errorEntry])
      setFeedback({ ok: false, crashPos: { r, c } })
      endRound(false)
    } else if (isEnd) {
      setHits((prev) => prev + 1)
      setFeedback({ ok: true })
      endRound(true)
    }
  }

  const endRound = (won) => {
    setGameState('feedback')
    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound((prev) => prev + 1)
        setupRound()
      } else {
        const finalHits = won ? hits + 1 : hits
        finishGame(finalHits)
      }
    }, 2000)
  }

  const finishGame = (finalHits) => {
    const totalTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const accuracy = Math.round((finalHits / TOTAL_ROUNDS) * 100)

    const sessionResult = {
      id: 'sess_' + Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Memoria',
      gameName: 'Ruta Oculta',
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      hits: finalHits,
      errorsCount: TOTAL_ROUNDS - finalHits,
      duration: `${totalTimeSec}s`,
      accuracy,
      errorLogs
    }
    onFinish(sessionResult)
  }

  if (!levelData) return null

  return (
    <div className="card game-card">
      <div className="game-header">
        <button className="btn btn-outline" onClick={onCancel}>✕ Salir</button>
        <span className="game-meta">Ronda {round} de {TOTAL_ROUNDS} | <strong>{difficulty.toUpperCase()}</strong></span>
      </div>

      <div className="game-body">
        {gameState === 'memorize' && (
          <>
            <h3 className="phase-title">👀 Memoriza el camino</h3>
            <div className="countdown-pill" style={{ backgroundColor: '#ef4444', color: 'white' }}>
              Ocultando en {countdown}s
            </div>
          </>
        )}
        
        {gameState === 'play' && (
          <>
            <h3 className="phase-title">🗺️ Traza tu ruta</h3>
            <p className="subtitle">Toca las casillas contiguas para avanzar hacia la meta sin chocar.</p>
          </>
        )}

        <div 
          className="path-grid" 
          style={{ gridTemplateColumns: `repeat(${levelData.cols}, 1fr)` }}
        >
          {Array.from({ length: levelData.rows }).map((_, r) => (
            Array.from({ length: levelData.cols }).map((_, c) => {
              const isEnd = r === levelData.end.r && c === levelData.end.c
              const isObstacle = levelData.obstacles.some((o) => o.r === r && o.c === c)
              const isCurrent = r === currentPos.r && c === currentPos.c
              const isPath = pathTaken.some((p) => p.r === r && p.c === c)
              
              const showObstacle = isObstacle && (gameState === 'memorize' || gameState === 'feedback')
              
              let cellClass = 'path-cell'
              if (isPath) cellClass += ' path-taken'
              if (gameState === 'play' && Math.abs(r - currentPos.r) + Math.abs(c - currentPos.c) === 1) {
                cellClass += ' adjacent'
              }
              if (feedback?.crashPos?.r === r && feedback?.crashPos?.c === c) {
                cellClass += ' crash'
              }

              return (
                <button
                  key={`${r}-${c}`}
                  className={cellClass}
                  onClick={() => handleCellClick(r, c)}
                  disabled={gameState !== 'play'}
                >
                  {isCurrent ? '🐰' : isEnd ? '🏁' : showObstacle ? '❌' : ''}
                </button>
              )
            })
          ))}
        </div>

        {feedback && (
          <div className="feedback-banner">
            {feedback.ok ? (
              <span className="text-success">✅ ¡Llegaste a salvo!</span>
            ) : (
              <span className="text-danger">💥 Chocaste con un obstáculo.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}