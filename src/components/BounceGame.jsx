import { useState, useEffect, useRef } from 'react'

// Dificultad más accesible y pausada para adultos mayores
const DIFFICULTY_CONFIG = {
  facil: { ballSpeed: 1.8, paddleWidth: 140, maxTime: 30 },
  medio: { ballSpeed: 2.8, paddleWidth: 110, maxTime: 30 },
  dificil: { ballSpeed: 4.0, paddleWidth: 90, maxTime: 30 }
}

export default function BounceGame({ difficulty = 'medio', customTime, onFinish, onCancel }) {
  const canvasRef = useRef(null)
  const requestRef = useRef()

  const getInitialTime = () => customTime ? parseInt(customTime, 10) : (DIFFICULTY_CONFIG[difficulty]?.maxTime || 30)

  const [gameState, setGameState] = useState('ready') // 'ready' | 'playing' | 'feedback'
  const [timeLeft, setTimeLeft] = useState(getInitialTime())
  const [bouncesCount, setBouncesCount] = useState(0)

  const engine = useRef({
    ball: { x: 200, y: 100, vx: 2, vy: 2.5, radius: 14 }, // Pelota ligeramente más grande y visible
    paddle: { x: 130, y: 370, width: 110, height: 16 },
    bounces: 0,
    drops: 0
  })

  useEffect(() => {
    if (gameState === 'ready') {
      setTimeLeft(getInitialTime())
    }
  }, [difficulty, customTime])

  const startGame = () => {
    const conf = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
    engine.current = {
      ball: { x: 200, y: 100, vx: conf.ballSpeed * (Math.random() > 0.5 ? 1 : -1), vy: conf.ballSpeed, radius: 14 },
      paddle: { x: 200 - conf.paddleWidth / 2, y: 370, width: conf.paddleWidth, height: 16 },
      bounces: 0,
      drops: 0
    }
    setBouncesCount(0)
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

    let clientX
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
    } else {
      clientX = e.clientX
    }

    const canvasX = (clientX - rect.left) * scaleX
    const conf = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
    
    // Mover la barra centrada en el dedo/mouse
    engine.current.paddle.x = canvasX - conf.paddleWidth / 2

    // Limitar dentro del canvas (400x400)
    if (engine.current.paddle.x < 0) engine.current.paddle.x = 0
    if (engine.current.paddle.x > 400 - conf.paddleWidth) {
      engine.current.paddle.x = 400 - conf.paddleWidth
    }
  }

  const gameLoop = () => {
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const st = engine.current
    const conf = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio

    // Movimiento de la pelota
    st.ball.x += st.ball.vx
    st.ball.y += st.ball.vy

    // Rebote paredes izq / der
    if (st.ball.x - st.ball.radius <= 0) {
      st.ball.x = st.ball.radius
      st.ball.vx *= -1
    } else if (st.ball.x + st.ball.radius >= 400) {
      st.ball.x = 400 - st.ball.radius
      st.ball.vx *= -1
    }

    // Rebote techo
    if (st.ball.y - st.ball.radius <= 0) {
      st.ball.y = st.ball.radius
      st.ball.vy *= -1
    }

    // Colisión con la barra (más suave y controlada)
    const p = st.paddle
    const b = st.ball
    if (
      b.y + b.radius >= p.y &&
      b.y - b.radius <= p.y + p.height &&
      b.x >= p.x &&
      b.x <= p.x + p.width
    ) {
      st.ball.y = p.y - b.radius 
      st.ball.vy *= -1
      
      // Ángulo de rebote más amigable (multiplicador reducido a 1.1 para evitar tiros muy diagonales)
      const hitPoint = (b.x - (p.x + p.width / 2)) / (p.width / 2)
      st.ball.vx = hitPoint * (conf.ballSpeed * 1.1)

      st.bounces++
      setBouncesCount(st.bounces)
    }

    // Si la pelota cae por debajo de la barra
    if (b.y > 420) {
      st.drops++
      
      // Reiniciar pelota al centro suavemente
      st.ball.x = 200
      st.ball.y = 150
      st.ball.vx = conf.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
      st.ball.vy = conf.ballSpeed
    }

    // --- RENDERIZAR ---
    ctx.clearRect(0, 0, 400, 400)

    // Dibujar Barra
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.roundRect(p.x, p.y, p.width, p.height, 8)
    ctx.fill()
    ctx.closePath()

    // Dibujar Pelota
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()

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
      const finalBounces = engine.current.bounces
      const finalDrops = engine.current.drops
      const maxTime = getInitialTime()
      
      const totalEvents = finalBounces + finalDrops
      const accuracy = totalEvents === 0 ? 100 : Math.round((finalBounces / totalEvents) * 100)

      const sessionResult = {
        id: 'sess_' + Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: 'Coordinación',
        gameName: 'Control de Rebote',
        difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        hits: finalBounces,
        errorsCount: finalDrops,
        duration: `${maxTime}s`,
        accuracy,
        errorLogs: finalDrops > 0 ? [{ item: 1, details: `La pelota cayó ${finalDrops} veces.` }] : []
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
            <h3 className="phase-title">🏓 Control de Rebote</h3>
            <p className="subtitle">Mueve la barra inferior deslizando el dedo o el mouse para mantener la pelota rebotando sin que caiga.</p>
            <button className="btn btn-primary" onClick={startGame} style={{ marginTop: '1rem' }}>Comenzar</button>
          </div>
        )}

        {gameState === 'playing' && (
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', color: '#2563eb', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Rebotes: {bouncesCount}
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
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        )}

        {gameState === 'feedback' && (
          <div className="feedback-banner">
            <span className="text-success">✅ ¡Tiempo completado!</span>
            <p style={{ marginTop: '0.5rem' }}>Lograste {bouncesCount} rebotes exitosos.</p>
          </div>
        )}

      </div>
    </div>
  )
}