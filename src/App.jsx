import { useState, useEffect } from 'react'
import './App.css'
import Memorygame from './components/Memorygame'
import AttentionGame from './components/Attentiongame'
import ReasoningGame from './components/ReasoningGame'
import CoordinationGame from './components/CoordinationGame'
import VisuospatialGame from './components/VisuospatialGame'

const CATEGORIES = [
  { id: 'memory', name: 'Memoria', icon: '🧠', gameName: 'Repetir secuencias' },
  { id: 'attention', name: 'Atención', icon: '🎯', gameName: 'Elemento diferente' },
  { id: 'reasoning', name: 'Razonamiento', icon: '🧩', gameName: 'Secuencias numéricas' },
  { id: 'coordination', name: 'Coordinación', icon: '🤝', gameName: 'Evitar obstáculos' },
  { id: 'visuospatial', name: 'Visuoespacial', icon: '👁️', gameName: 'Patrones simétricos' }
]

function App() {
  const [patients, setPatients] = useState(() => {
    if (typeof window === 'undefined') return []

    try {
      const saved = window.localStorage.getItem('patients_data')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Formulario nuevo paciente
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [notes, setNotes] = useState('')

  // Control de vistas y paciente activo
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'profile' | 'history' | 'game-setup' | 'playing'
  const [selectedSession, setSelectedSession] = useState(null)

  // Configuración de la sesión de juego
  const [gameConfig, setGameConfig] = useState({
    categoryId: 'memory',
    difficulty: 'facil' // 'facil' | 'medio' | 'dificil'
  })

  const activePatient = patients.find((p) => p.id === selectedPatientId) || null

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem('patients_data', JSON.stringify(patients))
    } catch (e) {
      console.error('Error al guardar en localStorage', e)
    }
  }, [patients])

  const handleAddPatient = (e) => {
    e.preventDefault()
    if (!name.trim() || !age) return

    const newPatient = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      age: Number(age),
      notes: notes.trim(),
      createdAt: new Date().toLocaleDateString(),
      history: []
    }

    setPatients([newPatient, ...patients])
    setName('')
    setAge('')
    setNotes('')
  }

  const handleDeletePatient = (id) => {
    setPatients(patients.filter((p) => p.id !== id))
    if (selectedPatientId === id) {
      setSelectedPatientId(null)
      setViewMode('list')
    }
  }

  const handleUpdateNotes = (id, newNotes) => {
    setPatients(patients.map((p) => (p.id === id ? { ...p, notes: newNotes } : p)))
  }

  // Guardar resultado y registrar errores en el paciente activo
  const handleFinishGame = (sessionResult) => {
    if (!activePatient) return

    const updatedHistory = [sessionResult, ...(activePatient.history || [])]
    const updatedPatients = patients.map((p) =>
      p.id === activePatient.id ? { ...p, history: updatedHistory } : p
    )

    setPatients(updatedPatients)
    setSelectedSession(sessionResult)
    setViewMode('history')
  }

  // Cálculo de estadísticas por categoría para el perfil individual
  const getCategoryStats = (categoryName) => {
    if (!activePatient?.history) return { count: 0, accuracy: 0 }
    const sessions = activePatient.history.filter((s) => s.category === categoryName)
    if (sessions.length === 0) return { count: 0, accuracy: 0 }
    const totalAccuracy = sessions.reduce((acc, curr) => acc + curr.accuracy, 0)
    return {
      count: sessions.length,
      accuracy: Math.round(totalAccuracy / sessions.length)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🧠 Brain Training PWA</h1>
        <p className="subtitle">Módulo de Evaluación y Estimulación Cognitiva</p>
      </header>

      {/* 1. VISTA: LISTA Y CREACIÓN DE PACIENTES */}
      {viewMode === 'list' && (
        <main className="main-layout">
          <section className="card">
            <h2>Nuevo Paciente</h2>
            <form onSubmit={handleAddPatient} className="form-group">
              <div className="field">
                <label htmlFor="name">Nombre completo</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="age">Edad</label>
                <input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Ej. 12"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="notes">Observaciones / Diagnóstico</label>
                <textarea
                  id="notes"
                  rows="3"
                  placeholder="Notas clínicas de la terapeuta..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Guardar Paciente
              </button>
            </form>
          </section>

          <section className="card">
            <h2>Mis Pacientes ({patients.length})</h2>
            {patients.length === 0 ? (
              <p className="empty-text">No hay pacientes registrados aún.</p>
            ) : (
              <ul className="patient-list">
                {patients.map((patient) => {
                  const isSelected = activePatient?.id === patient.id
                  return (
                    <li
                      key={patient.id}
                      className={`patient-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <div className="patient-info">
                        <strong>👤 {patient.name}</strong>
                        <span>{patient.age} años | {patient.history?.length || 0} actividades</span>
                      </div>

                      <div className="patient-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPatientId(patient.id)
                            setViewMode('profile')
                          }}
                        >
                          Perfil
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPatientId(patient.id)
                            setViewMode('history')
                          }}
                        >
                          Historial
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePatient(patient.id)
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      )}

      {/* 2. VISTA: PERFIL INDIVIDUAL CON CATEGORÍAS */}
      {viewMode === 'profile' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('list')}>
            ← Volver a Pacientes
          </button>

          <div className="profile-header">
            <h2>{activePatient.name}</h2>
            <span className="badge">Edad: {activePatient.age} años</span>
          </div>

          <hr className="divider" />

          <h3>Rendimiento por Categoría</h3>
          <div className="category-stats-grid">
            {CATEGORIES.map((cat) => {
              const stats = getCategoryStats(cat.name)
              return (
                <div
                  key={cat.id}
                  className="category-stat-card"
                  onClick={() => {
                    setGameConfig({ ...gameConfig, categoryId: cat.id })
                    setViewMode('game-setup')
                  }}
                >
                  <div className="stat-title">
                    <span>{cat.icon} {cat.name}</span>
                    <span className="btn-small-link">Entrenar →</span>
                  </div>
                  <div className="stat-values">
                    <span>{stats.count} ejercicios</span>
                    <strong>{stats.count > 0 ? `${stats.accuracy}% precisión` : 'Sin datos'}</strong>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="field" style={{ marginTop: '1.5rem' }}>
            <label>Observaciones Clínicas:</label>
            <textarea
              rows="3"
              value={activePatient.notes}
              onChange={(e) => handleUpdateNotes(activePatient.id, e.target.value)}
            />
          </div>
        </section>
      )}

      {/* 3. VISTA: HISTORIAL CON DETALLE DE ERRORES */}
      {viewMode === 'history' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('list')}>
            ← Volver a Pacientes
          </button>
          <h2>Historial de Actividades: {activePatient.name}</h2>

          {!activePatient.history || activePatient.history.length === 0 ? (
            <p className="empty-text">Sin registros de actividades completadas.</p>
          ) : (
            <div className="history-container">
              {activePatient.history.map((record) => (
                <div
                  key={record.id}
                  className="history-session-card"
                  onClick={() => setSelectedSession(selectedSession?.id === record.id ? null : record)}
                >
                  <div className="session-summary">
                    <div>
                      <strong>{record.category}</strong> — <span>{record.gameName}</span>
                      <small className="session-meta">({record.difficulty}) • {record.date}</small>
                    </div>
                    <div className="session-badge">
                      <span>{record.hits} aciertos / {record.errorsCount} errores</span>
                      <strong className="accuracy-tag">{record.accuracy}%</strong>
                    </div>
                  </div>

                  {selectedSession?.id === record.id && (
                    <div className="error-log-drawer">
                      <h4>Registro de Errores ({record.errorLogs?.length || 0})</h4>
                      {!record.errorLogs || record.errorLogs.length === 0 ? (
                        <p className="no-errors">🎉 Sesión perfecta, sin errores registrados.</p>
                      ) : (
                        <ul className="error-list">
                          {record.errorLogs.map((err, idx) => (
                            <li key={idx} className="error-item">
                              <span className="error-badge">Ejercicio {err.item}</span>
                              {err.sequence && (
                                <div><strong>Secuencia:</strong> <code>{err.sequence}</code></div>
                              )}
                              {err.userResponse && (
                                <div><strong>Respuesta:</strong> <code>{err.userResponse}</code></div>
                              )}
                              {err.details ? (
                                <div><strong>Detalle:</strong> <span className="text-danger">{err.details}</span></div>
                              ) : (
                                <>
                                  <div><strong>Respuesta:</strong> <span className="text-danger">{err.selected}</span></div>
                                  <div><strong>Correcta:</strong> <span className="text-success">{err.expected}</span></div>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. VISTA: SELECCIÓN DE DIFICULTAD Y ACTIVIDAD */}
      {viewMode === 'game-setup' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('profile')}>
            ← Volver al Perfil
          </button>

          <h2>Configurar Actividad</h2>
          <p className="subtitle">Paciente: <strong>{activePatient.name}</strong></p>

          <div className="setup-form">
            <div className="field">
              <label>Categoría</label>
              <select
                value={gameConfig.categoryId}
                onChange={(e) => setGameConfig({ ...gameConfig, categoryId: e.target.value })}
                className="select-input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} — {c.gameName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Nivel de Dificultad</label>
              <div className="difficulty-selector">
                {['facil', 'medio', 'dificil'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`btn ${gameConfig.difficulty === lvl ? 'btn-active' : 'btn-outline'}`}
                    onClick={() => setGameConfig({ ...gameConfig, difficulty: lvl })}
                  >
                    {lvl.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-success"
              style={{ marginTop: '1.5rem', width: '100%' }}
              onClick={() => setViewMode('playing')}
            >
              Iniciar Actividad →
            </button>
          </div>
        </section>
      )}

   {/* 5. VISTA: JUEGO EN EJECUCIÓN */}
      {viewMode === 'playing' && activePatient && (
        <>
          {gameConfig.categoryId === 'memory' && (
            <Memorygame
              difficulty={gameConfig.difficulty}
              onFinish={handleFinishGame}
              onCancel={() => setViewMode('game-setup')}
            />
          )}

          {gameConfig.categoryId === 'attention' && (
            <AttentionGame
              difficulty={gameConfig.difficulty}
              onFinish={handleFinishGame}
              onCancel={() => setViewMode('game-setup')}
            />
          )}

          {gameConfig.categoryId === 'reasoning' && (
            <ReasoningGame
              difficulty={gameConfig.difficulty}
              onFinish={handleFinishGame}
              onCancel={() => setViewMode('game-setup')}
            />
          )}

          {gameConfig.categoryId === 'coordination' && (
            <CoordinationGame
              difficulty={gameConfig.difficulty}
              onFinish={handleFinishGame}
              onCancel={() => setViewMode('game-setup')}
            />
          )}
          {gameConfig.categoryId === 'visuospatial' && (
            <VisuospatialGame
              difficulty={gameConfig.difficulty}
              onFinish={handleFinishGame}
              onCancel={() => setViewMode('game-setup')}
            />
          )}          
        </>
      )}
      
      {/* BARRA INFERIOR DE ACCIÓN RÁPIDA */}
      {activePatient && viewMode === 'list' && (
        <footer className="active-bar">
          <div>
            Paciente activo: <strong>{activePatient.name}</strong> ({activePatient.age} años)
          </div>
          <button className="btn btn-success" onClick={() => setViewMode('game-setup')}>
            Entrenar →
          </button>
        </footer>
      )}
    </div>
  )
}

export default App