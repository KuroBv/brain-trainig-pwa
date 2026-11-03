import { useState, useEffect, useRef } from 'react'

// Generador de secuencias según nivel
const generateExercise = (difficulty) => {
  let seq = []
  let answer = 0
  let patternDesc = ''

  if (difficulty === 'facil') {
    // Sumas simples: +2, +3, +5, +10
    const steps = [2, 3, 5, 10]
    const step = steps[Math.floor(Math.random() * steps.length)]
    const start = Math.floor(Math.random() * 5) + 1
    seq = [start, start + step, start + step * 2, start + step * 3]
    answer = start + step * 4
    patternDesc = `+${step}`
  } else if (difficulty === 'medio') {
    // Series mixtas o restas / múltiplos de 4, 6, 7, 8
    const isSubtraction = Math.random() > 0.5
    if (isSubtraction) {
      const step = Math.floor(Math.random() * 3) + 2
      const start = 30 + Math.floor(Math.random() * 20)
      seq = [start, start - step, start - step * 2, start - step * 3]
      answer = start - step * 4
      patternDesc = `-${step}`
    } else {
      const step = [4, 6, 7, 8][Math.floor(Math.random() * 4)]
      const start = Math.floor(Math.random() * 6) + 2
      seq = [start, start + step, start + step * 2, start + step * 3]
      answer = start + step * 4
      patternDesc = `+${step}`
    }
  } else {
    // Difícil: Progresión geométrica (x2, x3) o incremento cuadrático (+1, +2, +3...)
    const isGeometric = Math.random() > 0.4
    if (isGeometric) {
      const mult = Math.random() > 0.3 ? 2 : 3
      const start = mult === 2 ? Math.floor(Math.random() * 3) + 1 : 1
      seq = [start, start * mult, start * Math.pow(mult, 2), start * Math.pow(mult, 3)]
      answer = start * Math.pow(mult, 4)
      patternDesc = `×${mult}`
    } else {
      const start = 2
      seq = [start, start + 2, start + 5, start + 9] // +2, +3, +4
      answer = start + 14 // +5
      patternDesc = '+incremento'
    }
  }

  // Generar 3 distractores plausibles y mezclar opciones
  const distractors = new Set()
  while (distractors.size < 3) {
    const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1)
    const val = answer + offset
    if (val !== answer && val > 0) {
      distractors.add(val)
    }
  }

  const options = Array.from(distractors).concat(answer).sort(() => Math.random() - 0.5)

  return {
    sequenceText: seq.join(' → ') + ' → ?',
    correctAnswer: answer,
    options,
    patternDesc
  }
}

const TOTAL_ROUNDS = 5

export default function ReasoningGame({ difficulty = 'medio', onFinish, onCancel }) {
  const [round, setRound] = useState(1)
  const [currentExercise, setCurrentExercise] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null) // null | { ok: boolean }

  const [hits, setHits] = useState(0)
  const [errorLogs, setErrorLogs] = useState([])
  const startTimeRef = useRef(Date.now())

  const nextExercise = () => {
    setCurrentExercise(generateExercise(difficulty))
    setSelectedOption(null)
    setFeedback(null)
  }

  useEffect(() => {
    nextExercise()
    startTimeRef.current = Date.now()
  }, [difficulty])

  const handleSelect = (option) => {
    if (feedback !== null) return

    setSelectedOption(option)
    const isHit = option === currentExercise.correctAnswer
    let newErrors = []

    if (isHit) {
      setHits((prev) => prev + 1)
      setFeedback({ ok: true })
    } else {
      const errorEntry = {
        item: round,
        sequence: currentExercise.sequenceText,
        selected: String(option),
        expected: String(currentExercise.correctAnswer),
        details: `Patrón esperado: ${currentExercise.patternDesc}`
      }
      newErrors = [errorEntry]
      setErrorLogs((prev) => [...prev, errorEntry])
      setFeedback({ ok: false })
    }

    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound((prev) => prev + 1)
        nextExercise()
      } else {
        const finalHits = isHit ? hits + 1 : hits
        const finalErrors = isHit ? errorLogs : [...errorLogs, ...newErrors]
        finishGame(finalHits, finalErrors)
      }
    }, 1300)
  }

  const finishGame = (finalHits, finalErrors) => {
    const totalTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const accuracy = Math.round((finalHits / TOTAL_ROUNDS) * 100)

    const sessionResult = {
      id: 'sess_' + Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Razonamiento',
      gameName: 'Secuencias numéricas',
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      hits: finalHits,
      errorsCount: TOTAL_ROUNDS - finalHits,
      duration: `${totalTimeSec}s`,
      accuracy,
      errorLogs: finalErrors
    }

    onFinish(sessionResult)
  }

  if (!currentExercise) return null

  return (
    <div className="card game-card">
      <div className="game-header">
        <button className="btn btn-outline" onClick={onCancel}>✕ Salir</button>
        <span className="game-meta">
          Ejercicio {round} de {TOTAL_ROUNDS} | Nivel: <strong>{difficulty.toUpperCase()}</strong>
        </span>
      </div>

      <div className="game-body">
        <h3 className="phase-title">🧩 Completa la secuencia lógica</h3>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
          Descubre el patrón y toca el número que continúa
        </p>

        <div className="reasoning-display">
          <code>{currentExercise.sequenceText}</code>
        </div>

        <div className="reasoning-options-grid">
          {currentExercise.options.map((option, idx) => {
            const isChosen = selectedOption === option
            let btnClass = 'btn-reasoning-option'

            if (feedback !== null) {
              if (option === currentExercise.correctAnswer) btnClass += ' correct'
              else if (isChosen && !feedback.ok) btnClass += ' wrong'
            }

            return (
              <button
                key={idx}
                className={btnClass}
                onClick={() => handleSelect(option)}
                disabled={feedback !== null}
              >
                <span className="option-letter">{['A', 'B', 'C', 'D'][idx]})</span>
                <span className="option-val">{option}</span>
              </button>
            )
          })}
        </div>

        {feedback && (
          <div className="feedback-banner">
            {feedback.ok ? (
              <span className="text-success">✅ ¡Excelente razonamiento!</span>
            ) : (
              <span className="text-danger">
                ❌ Incorrecto. La respuesta era {currentExercise.correctAnswer} ({currentExercise.patternDesc})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}