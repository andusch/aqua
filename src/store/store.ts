// src/store.ts

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'aqua';
const STORE = 'docs';
const KEY = 'untitled';

let db: IDBPDatabase;
export async function initDB() {
  db = await openDB(DB_NAME, 1, {
    upgrade(b) { b.createObjectStore(STORE); }
  });
}

export async function saveDoc(text: string) {
  await db.put(STORE, text, KEY);
}

export async function loadDoc(): Promise<string | undefined> {
  return db.get(STORE, KEY);
}