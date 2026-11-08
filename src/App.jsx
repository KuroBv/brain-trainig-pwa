import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import './App.css'

import Memorygame from './components/Memorygame'
import PathGame from './components/PathGame'
import AttentionGame from './components/Attentiongame'
import ReasoningGame from './components/ReasoningGame'
import CoordinationGame from './components/CoordinationGame'
import VisuospatialGame from './components/VisuospatialGame'
import BounceGame from './components/BounceGame'

const CATEGORIES = [
  { 
    id: 'memory', 
    name: 'Memoria', 
    icon: '🧠', 
    games: [
      { id: 'sequence', name: 'Repetir secuencias' },
    ] 
  },
  { 
    id: 'attention', 
    name: 'Atención', 
    icon: '🎯', 
    games: [
      { id: 'diff', name: 'Elemento diferente' },
      { id: 'path', name: 'Ruta Oculta (Conejo)' }
    ] 
  },
  { 
    id: 'reasoning', 
    name: 'Razonamiento', 
    icon: '🧩', 
    games: [{ id: 'seq_num', name: 'Secuencias numéricas' }] 
  },
  { 
    id: 'coordination', 
    name: 'Coordinación', 
    icon: '🤝', 
    games: [
      { id: 'obs', name: 'Evitar obstáculos' },
      { id: 'bounce', name: 'Control de rebote'}
    ] 
  },
  { 
    id: 'visuospatial', 
    name: 'Visuoespacial', 
    icon: '👁️', 
    games: [{ id: 'sym', name: 'Patrones simétricos' }] 
  },
]

function App() {
  // Cargar Pacientes y Sesiones desde la BD local (IndexedDB)
  const patients = useLiveQuery(() => db.patients.toArray(), []) || []
  const allSessions = useLiveQuery(() => db.sessions.toArray(), []) || []

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [selectedSession, setSelectedSession] = useState(null)

  const [gameConfig, setGameConfig] = useState({
    categoryId: 'memory',
    gameId: 'sequence',
    difficulty: 'facil',
    customTime: ''
  })

  const activePatient = patients.find((p) => p.id === selectedPatientId) || null

  // Registrar nuevo paciente en la BD local
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (!name.trim() || !age) return

    const newId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    await db.patients.add({
      id: newId,
      name: name.trim(),
      age: Number(age),
      notes: notes.trim(),
      createdAt: new Date().toLocaleDateString()
    })

    setName('')
    setAge('')
    setNotes('')
  }

  // Eliminar paciente y sus sesiones de la BD local
  const handleDeletePatient = async (id) => {
    await db.patients.delete(id)
    await db.sessions.where('patientId').equals(id).delete()
    if (selectedPatientId === id) {
      setSelectedPatientId(null)
      setViewMode('list')
    }
  }

  // Guardar resultado del juego finalizado en la BD local
  const handleFinishGame = async (sessionResult) => {
    if (!activePatient) return

    const record = {
      ...sessionResult,
      patientId: activePatient.id,
      timestamp: Date.now()
    }

    await db.sessions.add(record)
    setSelectedSession(record)
    setViewMode('history')
  }

  // Historial filtrado e invertido cronológicamente
  const activePatientHistory = allSessions
    .filter((s) => s.patientId === selectedPatientId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  const getCategoryStats = (categoryName) => {
    const sessions = activePatientHistory.filter((s) => s.category === categoryName)
    if (sessions.length === 0) return { count: 0, accuracy: 0 }
    const totalAccuracy = sessions.reduce((acc, curr) => acc + curr.accuracy, 0)
    return {
      count: sessions.length,
      accuracy: Math.round(totalAccuracy / sessions.length)
    }
  }

  const activeCategoryObj = CATEGORIES.find(c => c.id === gameConfig.categoryId)

  return (
    <div className="container">
      <header className="header">
        <h1>🧠 Brain Training PWA</h1>
        <p className="subtitle">Módulo de Evaluación y Estimulación Cognitiva</p>
      </header>

      {/* VISTA 1: LISTA Y NUEVO PACIENTE */}
      {viewMode === 'list' && (
        <main className="main-layout">
          <section className="card">
            <h2>Nuevo Paciente</h2>
            <form onSubmit={handleAddPatient} className="form-group">
              <div className="field">
                <label>Nombre completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Edad</label>
                <input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} required />
              </div>
              <div className="field">
                <label>Observaciones</label>
                <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">Guardar Paciente</button>
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
                  const patientSessions = allSessions.filter(s => s.patientId === patient.id)
                  return (
                    <li key={patient.id} className={`patient-item ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedPatientId(patient.id)}>
                      <div className="patient-info">
                        <strong>👤 {patient.name}</strong>
                        <span>{patient.age} años | {patientSessions.length} actividades</span>
                      </div>
                      <div className="patient-actions">
                        <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); setViewMode('profile'); }}>Perfil</button>
                        <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); setViewMode('history'); }}>Historial</button>
                        <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeletePatient(patient.id); }}>✕</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      )}

      {/* VISTA 2: PERFIL */}
      {viewMode === 'profile' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('list')}>← Volver a Pacientes</button>
          <div className="profile-header">
            <h2>{activePatient.name}</h2>
            <span className="badge">Edad: {activePatient.age} años</span>
          </div>
          {activePatient.notes && <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>📝 {activePatient.notes}</p>}
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
                    setGameConfig({ categoryId: cat.id, gameId: cat.games[0].id, difficulty: 'facil', customTime: '' })
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
        </section>
      )}

      {/* VISTA 3: HISTORIAL */}
      {viewMode === 'history' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('list')}>← Volver a Pacientes</button>
          <h2>Historial de Actividades: {activePatient.name}</h2>
          {activePatientHistory.length === 0 ? (
            <p className="empty-text">Sin registros de actividades.</p>
          ) : (
            <div className="history-container">
              {activePatientHistory.map((record) => (
                <div key={record.id} className="history-session-card" onClick={() => setSelectedSession(selectedSession?.id === record.id ? null : record)}>
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
                      <h4>Registro de Errores</h4>
                      {!record.errorLogs || record.errorLogs.length === 0 ? (
                        <p className="no-errors">🎉 Sesión perfecta.</p>
                      ) : (
                        <ul className="error-list">
                          {record.errorLogs.map((err, idx) => (
                            <li key={idx} className="error-item">
                              <span className="error-badge">Ejercicio {err.item}</span>
                              {err.sequence && <div><strong>Secuencia:</strong> <code>{err.sequence}</code></div>}
                              {err.userResponse && <div><strong>Respuesta:</strong> <code>{err.userResponse}</code></div>}
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

      {/* VISTA 4: CONFIGURACIÓN DE ACTIVIDAD */}
      {viewMode === 'game-setup' && activePatient && (
        <section className="card detail-card">
          <button className="btn btn-outline back-btn" onClick={() => setViewMode('profile')}>← Volver al Perfil</button>
          <h2>Configurar Actividad</h2>
          <p className="subtitle">Paciente: <strong>{activePatient.name}</strong></p>
          
          <div className="setup-form">
            <div className="field">
              <label>Categoría</label>
              <select
                value={gameConfig.categoryId}
                onChange={(e) => {
                  const newCat = CATEGORIES.find(c => c.id === e.target.value)
                  setGameConfig({ ...gameConfig, categoryId: newCat.id, gameId: newCat.games[0].id })
                }}
                className="select-input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Actividad Específica</label>
              <select
                value={gameConfig.gameId}
                onChange={(e) => setGameConfig({ ...gameConfig, gameId: e.target.value })}
                className="select-input"
              >
                {activeCategoryObj?.games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
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

            {(gameConfig.categoryId === 'memory' || gameConfig.categoryId === 'coordination' || (gameConfig.categoryId === 'attention' && gameConfig.gameId === 'path')) && (
              <div className="field" style={{ marginTop: '1rem' }}>
                <label>Tiempo de duración (segundos)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Ej: 15"
                  value={gameConfig.customTime}
                  onChange={(e) => setGameConfig({ ...gameConfig, customTime: e.target.value })}
                  className="select-input"
                />
              </div>
            )}

            <button className="btn btn-success" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => setViewMode('playing')}>
              Iniciar Actividad →
            </button>
          </div>
        </section>
      )}

      {/* VISTA 5: EJECUCIÓN DEL JUEGO */}
      {viewMode === 'playing' && activePatient && (
        <>
          {gameConfig.categoryId === 'memory' && gameConfig.gameId === 'sequence' && (
            <Memorygame difficulty={gameConfig.difficulty} customTime={gameConfig.customTime} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'attention' && gameConfig.gameId === 'path' && (
            <PathGame difficulty={gameConfig.difficulty} customTime={gameConfig.customTime} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'attention' && gameConfig.gameId === 'diff' && (
            <AttentionGame difficulty={gameConfig.difficulty} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'reasoning' && (
            <ReasoningGame difficulty={gameConfig.difficulty} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'coordination' && gameConfig.gameId === 'obs' &&(
            <CoordinationGame difficulty={gameConfig.difficulty} customTime={gameConfig.customTime} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'coordination' && gameConfig.gameId === 'bounce' && (
            <BounceGame difficulty={gameConfig.difficulty} customTime={gameConfig.customTime} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}

          {gameConfig.categoryId === 'visuospatial' && (
            <VisuospatialGame difficulty={gameConfig.difficulty} onFinish={handleFinishGame} onCancel={() => setViewMode('game-setup')} />
          )}
        </>
      )}

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