import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'aqua';
const STORE = 'docs';
const KEY = 'untitled';

let db: IDBPDatabase | undefined;
export async function initDB() {
  db = await openDB(DB_NAME, 1, {
    upgrade(b) { b.createObjectStore(STORE); }
  });
}

export async function saveDoc(text: string) {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  await db.put(STORE, text, KEY);
}

export async function loadDoc(): Promise<string | undefined> {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db.get(STORE, KEY);
}