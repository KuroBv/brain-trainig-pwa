import { useState, useEffect, useRef } from 'react'

// Configuración de la dificultad (largo de la secuencia y tiempo por defecto)
const DIFFICULTY_CONFIG = {
  facil: { length: 4, viewTime: 10 },
  medio: { length: 6, viewTime: 8 },
  dificil: { length: 8, viewTime: 5 }
}

// Colores disponibles para los botones
const COLORS = [
  { id: 0, hex: '#ef4444', name: 'Rojo' },
  { id: 1, hex: '#3b82f6', name: 'Azul' },
  { id: 2, hex: '#22c55e', name: 'Verde' },
  { id: 3, hex: '#eab308', name: 'Amarillo' }
]

const TOTAL_ROUNDS = 4

export default function Memorygame({ difficulty = 'medio', customTime, onFinish, onCancel }) {
  const [round, setRound] = useState(1)
  const [targetSequence, setTargetSequence] = useState([])
  const [userSequence, setUserSequence] = useState([])
  
  const [gameState, setGameState] = useState('memorize') // 'memorize' | 'play' | 'feedback'
  const [countdown, setCountdown] = useState(999)
  const [feedback, setFeedback] = useState(null)

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio

  const generateSequence = () => {
    const seq = []
    for (let i = 0; i < config.length; i++) {
      const randomIndex = Math.floor(Math.random() * COLORS.length)
      seq.push(randomIndex)
    }
    setTargetSequence(seq)
    setUserSequence([])
    setGameState('memorize')
    
    // LÓGICA DE TIEMPO PERSONALIZADO CORREGIDA
    const timeToUse = customTime ? parseInt(customTime, 10) : config.viewTime
    setCountdown(timeToUse)
    setFeedback(null)
  }

  useEffect(() => {
    generateSequence()
    startTimeRef.current = Date.now()
  }, [difficulty])

  // Temporizador de memorización
  useEffect(() => {
    if (targetSequence.length === 0) return // <-- Agregamos esto para proteger el inicio
    
    let timer
    if (gameState === 'memorize') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
      } else {
        setGameState('play')
      }
    }
    return () => clearTimeout(timer)
  }, [gameState, countdown, targetSequence])

  const handleColorClick = (colorId) => {
    if (gameState !== 'play') return

    const newUserSeq = [...userSequence, colorId]
    setUserSequence(newUserSeq)

    const currentIndex = newUserSeq.length - 1

    // Verificar si se equivocó
    if (newUserSeq[currentIndex] !== targetSequence[currentIndex]) {
      const expectedColor = COLORS.find(c => c.id === targetSequence[currentIndex])?.name
      const selectedColor = COLORS.find(c => c.id === colorId)?.name
      
      const errorEntry = {
        item: round,
        expected: expectedColor,
        selected: selectedColor,
        details: `Se equivocó en el paso ${currentIndex + 1} de la secuencia`
      }
      setErrorLogs(prev => [...prev, errorEntry])
      setFeedback({ ok: false })
      endRound(false)
      return
    }

    // Verificar si completó la secuencia entera correctamente
    if (newUserSeq.length === targetSequence.length) {
      setHits(prev => prev + 1)
      setFeedback({ ok: true })
      endRound(true)
    }
  }

  const endRound = (won) => {
    setGameState('feedback')
    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound(prev => prev + 1)
        generateSequence()
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
      gameName: 'Repetir secuencias',
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      hits: finalHits,
      errorsCount: TOTAL_ROUNDS - finalHits,
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
        <span className="game-meta">Ronda {round} de {TOTAL_ROUNDS} | <strong>{difficulty.toUpperCase()}</strong></span>
      </div>

      <div className="game-body">
        {gameState === 'memorize' && (
          <>
            <h3 className="phase-title">👀 Memoriza la secuencia</h3>
            <div className="countdown-pill" style={{ backgroundColor: '#ef4444', color: 'white' }}>
              Ocultando en {countdown}s
            </div>
          </>
        )}
        
        {gameState === 'play' && (
          <>
            <h3 className="phase-title">🎮 Tu turno</h3>
            <p className="subtitle">Repite la secuencia exacta tocando los colores.</p>
          </>
        )}

        {/* Muestra la secuencia a memorizar */}
        <div className="sequence-display" style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '2rem 0', minHeight: '40px' }}>
          {targetSequence.map((colorId, index) => {
            const isVisible = gameState === 'memorize' || gameState === 'feedback' || index < userSequence.length
            const colorHex = COLORS.find(c => c.id === colorId)?.hex
            
            return (
              <div 
                key={index} 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isVisible ? colorHex : 'var(--border)',
                  transition: 'background-color 0.3s'
                }}
              />
            )
          })}
        </div>

        {/* Botones de colores para jugar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
          {COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => handleColorClick(color.id)}
              disabled={gameState !== 'play'}
              style={{
                backgroundColor: color.hex,
                aspectRatio: '1',
                borderRadius: '12px',
                border: 'none',
                cursor: gameState === 'play' ? 'pointer' : 'default',
                opacity: gameState === 'play' ? 1 : 0.5,
                transform: 'scale(1)',
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => { if(gameState === 'play') e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={(e) => { if(gameState === 'play') e.currentTarget.style.transform = 'scale(1)' }}
              onMouseLeave={(e) => { if(gameState === 'play') e.currentTarget.style.transform = 'scale(1)' }}
            />
          ))}
        </div>

        {feedback && (
          <div className="feedback-banner" style={{ marginTop: '2rem' }}>
            {feedback.ok ? (
              <span className="text-success">✅ ¡Secuencia correcta!</span>
            ) : (
              <span className="text-danger">💥 Te equivocaste de color.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}