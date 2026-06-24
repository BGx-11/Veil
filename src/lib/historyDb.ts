import Dexie, { type Table } from 'dexie';
import type { HistoryEntry } from './store';

export class HistoryDatabase extends Dexie {
  history!: Table<HistoryEntry, number>;

  constructor() {
    super('VeilBrowserHistory');
    
    // Define tables and indexes
    this.version(1).stores({
      history: '++id, url, timestamp, title' // Primary key and indexed props
    });
  }
}

export const historyDb = new HistoryDatabase();

// Helper to add history
export async function addHistoryToDb(entry: HistoryEntry) {
  try {
    await historyDb.history.add(entry);
  } catch (err) {
    console.error('Failed to add history entry', err);
  }
}

// Helper to load recent history
export async function loadRecentHistory(limit = 500): Promise<HistoryEntry[]> {
  try {
    return await historyDb.history
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error('Failed to load history', err);
    return [];
  }
}

// Helper to clear history
export async function clearHistoryDb() {
  try {
    await historyDb.history.clear();
  } catch (err) {
    console.error('Failed to clear history db', err);
  }
}
