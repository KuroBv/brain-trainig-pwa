import { useState, useEffect, useRef } from 'react'

const COLORS = [
  { id: 'blue', label: '🔵', name: 'Azul', bg: '#2563eb' },
  { id: 'green', label: '🟢', name: 'Verde', bg: '#16a34a' },
  { id: 'red', label: '🔴', name: 'Rojo', bg: '#dc2626' },
  { id: 'yellow', label: '🟡', name: 'Amarillo', bg: '#ca8a04' }
]

const DIFFICULTY_CONFIG = {
  facil: { length: 3, viewTime: 4 },
  medio: { length: 4, viewTime: 3 },
  dificil: { length: 5, viewTime: 2 }
}

const TOTAL_ROUNDS = 5

export default function Memorygame({ difficulty = 'medio', onFinish, onCancel }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
  const [round, setRound] = useState(1)
  const [gameState, setGameState] = useState('memorize') // 'memorize' | 'recall' | 'feedback' | 'finished'
  const [countdown, setCountdown] = useState(config.viewTime)

  const [targetSequence, setTargetSequence] = useState([])
  const [userSequence, setUserSequence] = useState([])

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const generateSequence = () => {
    const seq = []
    for (let i = 0; i < config.length; i++) {
      const randomIndex = Math.floor(Math.random() * COLORS.length)
      seq.push(COLORS[randomIndex])
    }
    setTargetSequence(seq)
    setUserSequence([])
    setGameState('memorize')
    setCountdown(config.viewTime)
  }

  useEffect(() => {
    generateSequence()
    startTimeRef.current = Date.now()
  }, [])

  useEffect(() => {
    let timer
    if (gameState === 'memorize') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
      } else {
        setGameState('recall')
      }
    }
    return () => clearTimeout(timer)
  }, [gameState, countdown])

  const handleColorClick = (color) => {
    if (gameState !== 'recall') return

    const nextUserSeq = [...userSequence, color]
    setUserSequence(nextUserSeq)

    if (nextUserSeq.length === targetSequence.length) {
      evaluateRound(nextUserSeq)
    }
  }

  const evaluateRound = (finalUserSeq) => {
    let hasError = false
    const positionErrors = []

    for (let i = 0; i < targetSequence.length; i++) {
      if (targetSequence[i].id !== finalUserSeq[i]?.id) {
        hasError = true
        positionErrors.push({
          pos: i + 1,
          expected: targetSequence[i].label,
          selected: finalUserSeq[i] ? finalUserSeq[i].label : 'Omitido'
        })
      }
    }

    let roundErrors = []
    if (!hasError) {
      setHits((prev) => prev + 1)
    } else {
      roundErrors = [
        {
          item: round,
          sequence: targetSequence.map((c) => c.label).join(' '),
          userResponse: finalUserSeq.map((c) => c.label).join(' '),
          details: positionErrors
            .map((err) => `Posición ${err.pos}: Esperado ${err.expected}, Seleccionado ${err.selected}`)
            .join(' | ')
        }
      ]
      setErrorLogs((prev) => [...prev, ...roundErrors])
    }

    setGameState('feedback')

    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound((prev) => prev + 1)
        generateSequence()
      } else {
        const finalHits = hasError ? hits : hits + 1
        const finalErrorLogs = hasError ? [...errorLogs, ...roundErrors] : errorLogs
        finishGame(finalHits, finalErrorLogs)
      }
    }, 1500)
  }

  const finishGame = (finalHits, finalErrors) => {
    setGameState('finished')
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
      errorLogs: finalErrors
    }

    onFinish(sessionResult)
  }

  return (
    <div className="card game-card">
      <div className="game-header">
        <button className="btn btn-outline" onClick={onCancel}>
          ✕ Salir
        </button>
        <span className="game-meta">
          Ejercicio {round} de {TOTAL_ROUNDS} | Nivel: <strong>{difficulty.toUpperCase()}</strong>
        </span>
      </div>

      <div className="game-body">
        {gameState === 'memorize' && (
          <div className="game-phase">
            <h3 className="phase-title">👀 Observa y memoriza</h3>
            <div className="countdown-pill">Tiempo restante: {countdown}s</div>
            <div className="sequence-display">
              {targetSequence.map((item, idx) => (
                <div key={idx} className="sequence-item animated-pop" style={{ borderColor: item.bg }}>
                  <span className="sequence-emoji">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'recall' && (
          <div className="game-phase">
            <h3 className="phase-title">👉 Repite la secuencia</h3>
            <div className="user-slots">
              {targetSequence.map((_, idx) => (
                <div key={idx} className="slot-item">
                  {userSequence[idx] ? userSequence[idx].label : '?'}
                </div>
              ))}
            </div>

            <div className="color-buttons-grid">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  className="btn-color-choice"
                  style={{ backgroundColor: c.bg }}
                  onClick={() => handleColorClick(c)}
                >
                  <span className="choice-emoji">{c.label}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'feedback' && (
          <div className="game-phase">
            <h3>Evaluando respuesta...</h3>
            <p className="subtitle">
              {userSequence.every((c, i) => c.id === targetSequence[i]?.id)
                ? '✅ ¡Excelente! Secuencia correcta.'
                : '❌ Hubo un error en la secuencia.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}