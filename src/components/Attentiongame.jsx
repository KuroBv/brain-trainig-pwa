import { useState, useEffect, useRef } from 'react'

const PAIRS_BY_DIFF = {
  facil: [
    { base: '🔵', target: '🔴', name: 'Círculo Rojo' },
    { base: '🟩', target: '⭐', name: 'Estrella' },
    { base: '🍎', target: '🍌', name: 'Plátano' }
  ],
  medio: [
    { base: '🟦', target: '🔷', name: 'Rombo Azul' },
    { base: '🟢', target: '🎾', name: 'Pelota Tenis' },
    { base: '😀', target: '🙂', name: 'Sonrisa suave' }
  ],
  dificil: [
    { base: '⭕', target: '🔘', name: 'Círculo con punto' },
    { base: '🟨', target: '🟧', name: 'Cuadrado Naranja' },
    { base: '🔹', target: '▪️', name: 'Cuadrado Pequeño' }
  ]
}

const DIFFICULTY_CONFIG = {
  facil: { size: 3 },
  medio: { size: 4 },
  dificil: { size: 5 }
}

const TOTAL_ROUNDS = 5

export default function AttentionGame({ difficulty = 'medio', onFinish, onCancel }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
  const [round, setRound] = useState(1)
  const [grid, setGrid] = useState([])
  const [targetPos, setTargetPos] = useState({ r: 0, c: 0 })
  const [currentPair, setCurrentPair] = useState(null)
  const [feedback, setFeedback] = useState(null) // null | { ok: boolean, selected: {r, c} }

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const setupRound = () => {
    const pairs = PAIRS_BY_DIFF[difficulty] || PAIRS_BY_DIFF.medio
    const selectedPair = pairs[Math.floor(Math.random() * pairs.length)]
    setCurrentPair(selectedPair)

    const targetR = Math.floor(Math.random() * config.size)
    const targetC = Math.floor(Math.random() * config.size)
    setTargetPos({ r: targetR, c: targetC })

    const newGrid = []
    for (let r = 0; r < config.size; r++) {
      const row = []
      for (let c = 0; c < config.size; c++) {
        if (r === targetR && c === targetC) {
          row.push(selectedPair.target)
        } else {
          row.push(selectedPair.base)
        }
      }
      newGrid.push(row)
    }

    setGrid(newGrid)
    setFeedback(null)
  }

  useEffect(() => {
    setupRound()
    startTimeRef.current = Date.now()
  }, [])

  const handleCellClick = (r, c) => {
    if (feedback !== null) return // Evita múltiples clics en la pausa

    const isHit = r === targetPos.r && c === targetPos.c
    let newErrors = []

    if (isHit) {
      setHits((prev) => prev + 1)
      setFeedback({ ok: true, selected: { r, c } })
    } else {
      const errorEntry = {
        item: round,
        selected: `Fila ${r + 1}, Columna ${c + 1}`,
        expected: `Fila ${targetPos.r + 1}, Columna ${targetPos.c + 1}`,
        details: `Elemento buscado: ${currentPair?.target || 'Diferente'}`
      }
      newErrors = [errorEntry]
      setErrorLogs((prev) => [...prev, errorEntry])
      setFeedback({ ok: false, selected: { r, c } })
    }

    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound((prev) => prev + 1)
        setupRound()
      } else {
        const finalHits = isHit ? hits + 1 : hits
        const finalErrors = isHit ? errorLogs : [...errorLogs, ...newErrors]
        finishGame(finalHits, finalErrors)
      }
    }, 1200)
  }

  const finishGame = (finalHits, finalErrors) => {
    const totalTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const accuracy = Math.round((finalHits / TOTAL_ROUNDS) * 100)

    const sessionResult = {
      id: 'sess_' + Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Atención',
      gameName: 'Elemento diferente',
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
        <button className="btn btn-outline" onClick={onCancel}>✕ Salir</button>
        <span className="game-meta">
          Ejercicio {round} de {TOTAL_ROUNDS} | Nivel: <strong>{difficulty.toUpperCase()}</strong>
        </span>
      </div>

      <div className="game-body">
        <h3 className="phase-title">🎯 Encuentra el elemento diferente</h3>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
          Toca el símbolo distinto en la cuadrícula
        </p>

        <div
          className="attention-grid"
          style={{
            gridTemplateColumns: `repeat(${config.size}, 1fr)`,
            maxWidth: config.size === 3 ? '280px' : config.size === 4 ? '360px' : '420px'
          }}
        >
          {grid.map((row, rIdx) =>
            row.map((symbol, cIdx) => {
              const isTarget = rIdx === targetPos.r && cIdx === targetPos.c
              const isSelected = feedback?.selected.r === rIdx && feedback?.selected.c === cIdx

              let cellStyle = 'grid-cell'
              if (feedback !== null) {
                if (isSelected && feedback.ok) cellStyle += ' hit'
                else if (isSelected && !feedback.ok) cellStyle += ' miss'
                else if (isTarget && !feedback.ok) cellStyle += ' reveal'
              }

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  className={cellStyle}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  disabled={feedback !== null}
                >
                  {symbol}
                </button>
              )
            })
          )}
        </div>

        {feedback && (
          <div className="feedback-banner">
            {feedback.ok ? (
              <span className="text-success">✅ ¡Correcto! Elemento encontrado.</span>
            ) : (
              <span className="text-danger">
                ❌ Incorrecto. Estaba en la Fila {targetPos.r + 1}, Columna {targetPos.c + 1}.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}