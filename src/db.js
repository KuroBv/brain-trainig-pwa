import Dexie from 'dexie';

// Inicializar la base de datos local en IndexedDB
export const db = new Dexie('BrainTrainingDB');

// Definición del esquema de tablas e índices
db.version(1).stores({
  patients: 'id, name, age, createdAt',
  sessions: '++id, patientId, category, gameName, difficulty, accuracy, hits, errorsCount, date, timestamp'
});