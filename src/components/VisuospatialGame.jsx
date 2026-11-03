import { useState, useEffect, useRef } from 'react'

const DIFFICULTY_CONFIG = {
  facil: { rows: 2, cols: 2 },
  medio: { rows: 3, cols: 3 },
  dificil: { rows: 4, cols: 4 }
}

const TOTAL_ROUNDS = 4

export default function VisuospatialGame({ difficulty = 'medio', onFinish, onCancel }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medio
  const [round, setRound] = useState(1)

  const [leftPattern, setLeftPattern] = useState([])
  const [rightUserGrid, setRightUserGrid] = useState([])
  const [feedback, setFeedback] = useState(null)

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const setupRound = () => {
    // Generar patrón en la mitad izquierda con 40%-60% de celdas activas
    const left = []
    for (let r = 0; r < config.rows; r++) {
      const row = []
      for (let c = 0; c < config.cols; c++) {
        row.push(Math.random() > 0.5)
      }
      left.push(row)
    }

    // Asegurar que haya al menos una celda activa
    if (!left.some((row) => row.some(Boolean))) {
      left[0][0] = true
    }

    // Matriz vacía para la interacción del paciente
    const emptyRight = Array.from({ length: config.rows }, () =>
      Array(config.cols).fill(false)
    )

    setLeftPattern(left)
    setRightUserGrid(emptyRight)
    setFeedback(null)
  }

  useEffect(() => {
    setupRound()
    startTimeRef.current = Date.now()
  }, [difficulty])

  const toggleCell = (r, c) => {
    if (feedback !== null) return
    setRightUserGrid((prev) => {
      const copy = prev.map((row) => [...row])
      copy[r][c] = !copy[r][c]
      return copy
    })
  }

  const validatePattern = () => {
    if (feedback !== null) return

    let roundErrors = []

    // El reflejo especular de la columna c (0..N-1) es (N - 1 - c)
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const mirroredCol = config.cols - 1 - c
        const expected = leftPattern[r][c]
        const actual = rightUserGrid[r][mirroredCol]

        if (expected !== actual) {
          const displayedCol = config.cols + mirroredCol + 1
          roundErrors.push({
            item: round,
            selected: `Fila ${r + 1}, Columna ${displayedCol} (${actual ? 'Pintada' : 'Vacía'})`,
            expected: `Fila ${r + 1}, Columna ${displayedCol} (${expected ? 'Pintada' : 'Vacía'})`,
            details: 'Discrepancia en simetría especular'
          })
        }
      }
    }

    const isCorrect = roundErrors.length === 0

    if (isCorrect) {
      setHits((prev) => prev + 1)
      setFeedback({ ok: true })
    } else {
      setErrorLogs((prev) => [...prev, ...roundErrors])
      setFeedback({ ok: false, errorsCount: roundErrors.length })
    }

    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound((prev) => prev + 1)
        setupRound()
      } else {
        const finalHits = isCorrect ? hits + 1 : hits
        const finalErrors = isCorrect ? errorLogs : [...errorLogs, ...roundErrors]
        finishGame(finalHits, finalErrors)
      }
    }, 1500)
  }

  const finishGame = (finalHits, finalErrors) => {
    const totalTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const accuracy = Math.round((finalHits / TOTAL_ROUNDS) * 100)

    const sessionResult = {
      id: 'sess_' + Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Visuoespacial',
      gameName: 'Patrones simétricos',
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
        <h3 className="phase-title">👁️ Completa el reflejo en el espejo</h3>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
          Toca las casillas de la derecha para reflejar simétricamente la figura
        </p>

        <div className="symmetry-board-wrapper">
          {/* Lado izquierdo (referencia) */}
          <div
            className="symmetry-subgrid"
            style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
          >
            {leftPattern.map((row, r) =>
              row.map((active, c) => (
                <div
                  key={`left-${r}-${c}`}
                  className={`symmetry-cell fixed ${active ? 'filled' : ''}`}
                />
              ))
            )}
          </div>

          {/* Eje de simetría vertical */}
          <div className="symmetry-axis-line">
            <span>EJE</span>
          </div>

          {/* Lado derecho (interactivo) */}
          <div
            className="symmetry-subgrid interactive"
            style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
          >
            {rightUserGrid.map((row, r) =>
              row.map((active, c) => (
                <button
                  key={`right-${r}-${c}`}
                  className={`symmetry-cell ${active ? 'filled' : ''}`}
                  onClick={() => toggleCell(r, c)}
                  disabled={feedback !== null}
                />
              ))
            )}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ maxWidth: '280px', margin: '1.5rem auto 0', display: 'block' }}
          onClick={validatePattern}
          disabled={feedback !== null}
        >
          Validar Simetría ✓
        </button>

        {feedback && (
          <div className="feedback-banner">
            {feedback.ok ? (
              <span className="text-success">✅ ¡Patrón simétrico perfecto!</span>
            ) : (
              <span className="text-danger">
                ❌ Discrepancia detectada ({feedback.errorsCount} casillas incorrectas).
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}