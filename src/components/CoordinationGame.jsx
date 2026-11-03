import { useState, useEffect, useRef } from 'react'

const STAGES_CONFIG = {
  facil: {
    rounds: [
      {
        obstacles: [
          { id: 1, x: 120, y: 0, w: 25, h: 180 },
          { id: 2, x: 230, y: 100, w: 25, h: 180 }
        ],
        start: { x: 35, y: 40 },
        target: { x: 320, y: 240 }
      },
      {
        obstacles: [
          { id: 1, x: 150, y: 80, w: 30, h: 200 },
          { id: 2, x: 240, y: 0, w: 30, h: 160 }
        ],
        start: { x: 35, y: 240 },
        target: { x: 320, y: 40 }
      },
      {
        obstacles: [
          { id: 1, x: 100, y: 50, w: 150, h: 25 },
          { id: 2, x: 120, y: 190, w: 150, h: 25 }
        ],
        start: { x: 35, y: 135 },
        target: { x: 320, y: 135 }
      }
    ]
  },
  medio: {
    rounds: [
      {
        obstacles: [
          { id: 1, x: 90, y: 0, w: 22, h: 190 },
          { id: 2, x: 170, y: 90, w: 22, h: 190 },
          { id: 3, x: 250, y: 0, w: 22, h: 190 }
        ],
        start: { x: 30, y: 40 },
        target: { x: 320, y: 240 }
      },
      {
        obstacles: [
          { id: 1, x: 80, y: 80, w: 22, h: 200 },
          { id: 2, x: 160, y: 0, w: 22, h: 180 },
          { id: 3, x: 240, y: 80, w: 22, h: 200 }
        ],
        start: { x: 30, y: 240 },
        target: { x: 320, y: 40 }
      },
      {
        obstacles: [
          { id: 1, x: 100, y: 0, w: 22, h: 140 },
          { id: 2, x: 100, y: 190, w: 22, h: 90 },
          { id: 3, x: 220, y: 70, w: 22, h: 210 }
        ],
        start: { x: 30, y: 140 },
        target: { x: 320, y: 140 }
      }
    ]
  },
  dificil: {
    rounds: [
      {
        obstacles: [
          { id: 1, x: 75, y: 0, w: 20, h: 200 },
          { id: 2, x: 140, y: 80, w: 20, h: 200 },
          { id: 3, x: 205, y: 0, w: 20, h: 200 },
          { id: 4, x: 270, y: 80, w: 20, h: 200 }
        ],
        start: { x: 25, y: 40 },
        target: { x: 330, y: 240 }
      },
      {
        obstacles: [
          { id: 1, x: 70, y: 60, w: 20, h: 220 },
          { id: 2, x: 135, y: 0, w: 20, h: 210 },
          { id: 3, x: 200, y: 70, w: 20, h: 210 },
          { id: 4, x: 265, y: 0, w: 20, h: 210 }
        ],
        start: { x: 25, y: 240 },
        target: { x: 330, y: 40 }
      },
      {
        obstacles: [
          { id: 1, x: 70, y: 0, w: 20, h: 170 },
          { id: 2, x: 135, y: 110, w: 20, h: 170 },
          { id: 3, x: 200, y: 0, w: 20, h: 170 },
          { id: 4, x: 265, y: 110, w: 20, h: 170 }
        ],
        start: { x: 25, y: 140 },
        target: { x: 330, y: 140 }
      }
    ]
  }
}

const TOTAL_ROUNDS = 3
const BOARD_W = 360
const BOARD_H = 280
const PLAYER_R = 14

export default function CoordinationGame({ difficulty = 'medio', onFinish, onCancel }) {
  const stageConfig = STAGES_CONFIG[difficulty] || STAGES_CONFIG.medio
  const [round, setRound] = useState(1)
  const currentStage = stageConfig.rounds[round - 1]

  const [playerPos, setPlayerPos] = useState(currentStage.start)
  const [isDragging, setIsDragging] = useState(false)
  const [roundCompleted, setRoundCompleted] = useState(false)
  const [collisionsCount, setCollisionsCount] = useState(0)

  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())
  const lastCollisionTimeRef = useRef(0)
  const boardRef = useRef(null)

  useEffect(() => {
    setPlayerPos(currentStage.start)
    setRoundCompleted(false)
  }, [round])

  const checkCollision = (x, y) => {
    for (const obs of currentStage.obstacles) {
      if (
        x + PLAYER_R > obs.x &&
        x - PLAYER_R < obs.x + obs.w &&
        y + PLAYER_R > obs.y &&
        y - PLAYER_R < obs.y + obs.h
      ) {
        return obs
      }
    }
    return null
  }

  const checkGoal = (x, y) => {
    const dist = Math.hypot(x - currentStage.target.x, y - currentStage.target.y)
    return dist < PLAYER_R + 18
  }

  const handlePointerDown = (e) => {
    if (roundCompleted) return
    const rect = boardRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    const distToPlayer = Math.hypot(x - playerPos.x, y - playerPos.y)
    if (distToPlayer <= PLAYER_R * 2) {
      setIsDragging(true)
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging || roundCompleted) return
    const rect = boardRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    let x = clientX - rect.left
    let y = clientY - rect.top

    x = Math.max(PLAYER_R, Math.min(BOARD_W - PLAYER_R, x))
    y = Math.max(PLAYER_R, Math.min(BOARD_H - PLAYER_R, y))

    const hitObs = checkCollision(x, y)
    const now = Date.now()
    if (hitObs && now - lastCollisionTimeRef.current > 700) {
      lastCollisionTimeRef.current = now
      setCollisionsCount((prev) => prev + 1)

      const elapsedSec = ((now - startTimeRef.current) / 1000).toFixed(1)
      const errEntry = {
        item: round,
        selected: `Colisión con Obstáculo #${hitObs.id}`,
        expected: 'Trayectoria despejada sin contacto',
        details: `Impacto a los ${elapsedSec}s de recorrido`
      }
      setErrorLogs((prev) => [...prev, errEntry])

      setIsDragging(false)
      setPlayerPos(currentStage.start)
      return
    }

    setPlayerPos({ x, y })

    if (checkGoal(x, y)) {
      setIsDragging(false)
      setRoundCompleted(true)

      setTimeout(() => {
        if (round < TOTAL_ROUNDS) {
          setRound((prev) => prev + 1)
        } else {
          finishGame()
        }
      }, 1000)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const finishGame = () => {
    const totalTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const penalty = collisionsCount * 15
    const accuracy = Math.max(20, Math.min(100, 100 - penalty))
    const hits = Math.max(0, TOTAL_ROUNDS - Math.min(TOTAL_ROUNDS, collisionsCount))

    const sessionResult = {
      id: 'sess_' + Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Coordinación',
      gameName: 'Evitar obstáculos',
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      hits,
      errorsCount: collisionsCount,
      duration: `${totalTimeSec}s`,
      accuracy,
      errorLogs
    }

    onFinish(sessionResult)
  }

  return (
    <div className="card game-card">
      <div className="game-header">
        <button className="btn btn-outline" onClick={onCancel}>✕ Salir</button>
        <span className="game-meta">
          Recorrido {round} de {TOTAL_ROUNDS} | Nivel: <strong>{difficulty.toUpperCase()}</strong>
        </span>
      </div>

      <div className="game-body">
        <h3 className="phase-title">🤝 Lleva el círculo hasta la meta</h3>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>
          Arrastra ● hasta 🏁 evitando tocar los bloques rojos
        </p>

        <div
          ref={boardRef}
          className="coordination-canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ width: BOARD_W, height: BOARD_H }}
        >
          {currentStage.obstacles.map((obs) => (
            <div
              key={obs.id}
              className="coord-obstacle"
              style={{
                left: obs.x,
                top: obs.y,
                width: obs.w,
                height: obs.h
              }}
            />
          ))}

          <div
            className="coord-target"
            style={{
              left: currentStage.target.x - 18,
              top: currentStage.target.y - 18
            }}
          >
            🏁
          </div>

          <div
            className={`coord-player ${isDragging ? 'dragging' : ''}`}
            style={{
              left: playerPos.x - PLAYER_R,
              top: playerPos.y - PLAYER_R,
              width: PLAYER_R * 2,
              height: PLAYER_R * 2
            }}
          />
        </div>

        <div className="coord-stats-bar">
          <span>Colisiones registradas: <strong className="text-danger">{collisionsCount}</strong></span>
          {roundCompleted && <span className="text-success">✅ ¡Meta alcanzada!</span>}
        </div>
      </div>
    </div>
  )
}