import Dexie from 'dexie';

// Inicializar la base de datos local en IndexedDB
export const db = new Dexie('BrainTrainingDB');

// Esquema de tablas e índices para pacientes e historial
db.version(1).stores({
  patients: 'id, name, age, createdAt',
  sessions: '++id, patientId, category, gameName, difficulty, accuracy, hits, errorsCount, date, timestamp'
});