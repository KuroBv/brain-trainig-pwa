import { useState, useEffect, useRef } from 'react'

// Dificultad equilibrada: Ni tan lento ni imposible.
const DIFFICULTY_CONFIG = {
  facil: { spawnInterval: 2000, speedMulti: 0.8, maxTime: 30 },
  medio: { spawnInterval: 1400, speedMulti: 1.2, maxTime: 30 },
  dificil: { spawnInterval: 900, speedMulti: 1.8, maxTime: 30 }
}

const OBSTACLE_TYPES = ['circle', 'square', 'triangle']

export default function CoordinationGame({ difficulty = 'medio', customTime, onFinish, onCancel }) {
  const canvasRef = useRef(null)
  const requestRef = useRef()
  
  // Calcular el tiempo a usar (el personalizado o el por defecto)
  const getInitialTime = () => customTime ? parseInt(customTime, 10) : (DIFFICULTY_CONFIG[difficulty]?.maxTime || 30)
  
  const [gameState, setGameState] = useState('ready') 
  const [timeLeft, setTimeLeft] = useState(getInitialTime())
  const [errorCount, setErrorCount] = useState(0)

  const engine = useRef({
    player: { x: 200, y: 200, radius: 20 },
    obstacles: [],
    lastSpawn: 0,
    errors: 0,
    isInvulnerable: false,
    invulnerableTimer: 0
  })

  // Actualizar el tiempo si cambian las props antes de jugar
  useEffect(() => {
    if (gameState === 'ready') {
      setTimeLeft(getInitialTime())
    }
  }, [difficulty, customTime])

  const startGame = () => {
    engine.current = {
      player: { x: 200, y: 200, radius: 20 },
      obstacles: [],
      lastSpawn: 0,
      errors: 0,
      isInvulnerable: false,
      invulnerableTimer: 0
    }
    setErrorCount(0)
    setTimeLeft(getInitialTime())
    setGameState('playing')
  }

  useEffect(() => {
    let timer
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            endGame()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [gameState])

  const handleMove = (e) => {
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX, clientY
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    engine.current.player.x = (clientX - rect.left) * scaleX
    engine.current.player.y = (clientY - rect.top) * scaleY
  }

  const spawnObstacle = (time, conf) => {
    engine.current.lastSpawn = time
    const edge = Math.floor(Math.random() * 4) 
    const size = 15 + Math.random() * 10 // Tamaño intermedio
    const baseSpeed = (0.8 + Math.random() * 0.5) * conf.speedMulti
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]

    let x, y, vx, vy
    if (edge === 0) { // Arriba
      x = Math.random() * 400
      y = -size
      vx = (Math.random() - 0.5) * baseSpeed * 1.5
      vy = baseSpeed
    } else if (edge === 1) { // Derecha
      x = 400 + size
      y = Math.random() * 400
      vx = -baseSpeed
      vy = (Math.random() - 0.5) * baseSpeed * 1.5
    } else if (edge === 2) { // Abajo
      x = Math.random() * 400
      y = 400 + size
      vx = (Math.random() - 0.5) * baseSpeed * 1.5
      vy = -baseSpeed
    } else { // Izquierda
      x = -size
      y = Math.random() * 400
      vx = baseSpeed
      vy = (Math.random() - 0.5) * baseSpeed * 1.5
    }

    engine.current.obstacles.push({ x, y, vx, vy, radius: size, type })
  }

  const gameLoop = (time) => {
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const st = engine.current
    const conf = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio

    if (time - st.lastSpawn > conf.spawnInterval) {
      spawnObstacle(time, conf)
    }

    for (let i = st.obstacles.length - 1; i >= 0; i--) {
      let obs = st.obstacles[i]
      obs.x += obs.vx
      obs.y += obs.vy

      const dx = obs.x - st.player.x
      const dy = obs.y - st.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Colisión intermedia (multiplicador 0.85)
      const collisionThreshold = (obs.radius + st.player.radius) * 0.85

      if (distance < collisionThreshold && !st.isInvulnerable) {
        st.errors++
        setErrorCount(st.errors)
        st.isInvulnerable = true
        st.invulnerableTimer = time
      }

      if (obs.x < -100 || obs.x > 500 || obs.y < -100 || obs.y > 500) {
        st.obstacles.splice(i, 1)
      }
    }

    // 1.5 segundos de invulnerabilidad tras un choque
    if (st.isInvulnerable && time - st.invulnerableTimer > 1500) {
      st.isInvulnerable = false
    }

    // --- DIBUJAR ---
    ctx.clearRect(0, 0, 400, 400)

    // Dibujar Jugador
    ctx.beginPath()
    ctx.arc(st.player.x, st.player.y, st.player.radius, 0, Math.PI * 2)
    if (st.isInvulnerable && Math.floor(time / 150) % 2 === 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)' 
    } else {
      ctx.fillStyle = '#2563eb' 
    }
    ctx.fill()
    ctx.closePath()

    // Dibujar Obstáculos
    st.obstacles.forEach((obs) => {
      if (obs.type === 'circle') {
        ctx.fillStyle = '#ef4444' 
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()
      } else if (obs.type === 'square') {
        ctx.fillStyle = '#f59e0b' 
        ctx.fillRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2)
      } else if (obs.type === 'triangle') {
        ctx.fillStyle = '#8b5cf6' 
        ctx.beginPath()
        ctx.moveTo(obs.x, obs.y - obs.radius)
        ctx.lineTo(obs.x + obs.radius, obs.y + obs.radius)
        ctx.lineTo(obs.x - obs.radius, obs.y + obs.radius)
        ctx.fill()
        ctx.closePath()
      }
    })

    requestRef.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(gameLoop)
    }
    return () => cancelAnimationFrame(requestRef.current)
  }, [gameState, difficulty])

  const endGame = () => {
    setGameState('feedback')
    cancelAnimationFrame(requestRef.current)
    
    setTimeout(() => {
      const finalErrors = engine.current.errors
      const maxTime = getInitialTime()
      const accuracy = Math.max(0, 100 - (finalErrors * 5))

      const sessionResult = {
        id: 'sess_' + Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: 'Coordinación',
        gameName: 'Evitar obstáculos',
        difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        hits: maxTime, 
        errorsCount: finalErrors,
        duration: `${maxTime}s`,
        accuracy,
        errorLogs: finalErrors > 0 ? [{ item: 1, details: `El paciente colisionó ${finalErrors} veces durante los ${maxTime} segundos.` }] : []
      }
      onFinish(sessionResult)
    }, 2000)
  }

  return (
    <div className="card game-card">
      <div className="game-header">
        <button className="btn btn-outline" onClick={onCancel}>✕ Salir</button>
        <span className="game-meta">⏳ {timeLeft}s | <strong>{difficulty.toUpperCase()}</strong></span>
      </div>

      <div className="game-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {gameState === 'ready' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h3 className="phase-title">🤝 Evitar Formas</h3>
            <p className="subtitle">Mantén el dedo sobre el <strong>círculo azul</strong> y muévelo suavemente para esquivar las figuras geométricas.</p>
            <button className="btn btn-primary" onClick={startGame} style={{ marginTop: '1rem' }}>Comenzar</button>
          </div>
        )}

        {gameState === 'playing' && (
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', color: errorCount > 0 ? '#ef4444' : '#6b7280', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Choques: {errorCount}
            </div>

            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onMouseMove={handleMove}
              onTouchMove={handleMove}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                backgroundColor: 'var(--card-nested)',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                touchAction: 'none',
                cursor: 'crosshair',
                boxShadow: errorCount > 0 ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
                transition: 'box-shadow 0.2s'
              }}
            />
          </div>
        )}

        {gameState === 'feedback' && (
          <div className="feedback-banner">
            <span className="text-success">✅ ¡Tiempo completado!</span>
            <p style={{ marginTop: '0.5rem' }}>Tuviste {errorCount} choques en total.</p>
          </div>
        )}

      </div>
    </div>
  )
}