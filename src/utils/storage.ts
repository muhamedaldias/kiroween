/**
 * Local storage utilities for saving and loading specs
 */

const STORAGE_KEY = 'ghostspec_history';

interface SpecHistoryItem {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface SpecHistory {
  version: number;
  items: SpecHistoryItem[];
}

const DEFAULT_HISTORY: SpecHistory = {
  version: 1,
  items: []
};

/**
 * Load spec history from localStorage
 */
export function loadSpecHistory(): SpecHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_HISTORY;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_HISTORY;
  }
}

/**
 * Save spec history to localStorage
 */
export function saveSpecHistory(history: SpecHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Add or update a spec in history
 */
export function saveSpec(name: string, content: string): SpecHistory {
  const history = loadSpecHistory();
  const now = new Date().toISOString();
  const id = `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if spec already exists
  const existingIndex = history.items.findIndex(item => item.content === content);
  
  if (existingIndex >= 0) {
    // Update existing
    history.items[existingIndex] = {
      ...history.items[existingIndex],
      name,
      updatedAt: now
    };
  } else {
    // Add new
    history.items.unshift({
      id,
      name: name || `Unnamed Spec ${history.items.length + 1}`,
      content,
      createdAt: now,
      updatedAt: now
    });
    
    // Limit to 50 items
    if (history.items.length > 50) {
      history.items = history.items.slice(0, 50);
    }
  }

  saveSpecHistory(history);
  return history;
}

/**
 * Delete a spec from history
 */
export function deleteSpec(id: string): SpecHistory {
  const history = loadSpecHistory();
  history.items = history.items.filter(item => item.id !== id);
  saveSpecHistory(history);
  return history;
}

/**
 * Get a specific spec from history
 */
export function getSpec(id: string): SpecHistoryItem | null {
  const history = loadSpecHistory();
  return history.items.find(item => item.id === id) || null;
}

/**
 * Clear all spec history
 */
export function clearSpecHistory(): void {
  saveSpecHistory(DEFAULT_HISTORY);
}

/**
 * Export history as JSON
 */
export function exportSpecHistory(): string {
  return JSON.stringify(loadSpecHistory(), null, 2);
}

/**
 * Import history from JSON
 */
export function importSpecHistory(json: string): void {
  try {
    const imported = JSON.parse(json);
    if (imported.version === 1 && Array.isArray(imported.items)) {
      saveSpecHistory(imported);
    }
  } catch {
    // Invalid JSON
  }
}

/**
 * Get recent specs (last 10)
 */
export function getRecentSpecs(): SpecHistoryItem[] {
  const history = loadSpecHistory();
  return history.items.slice(0, 10);
}

/**
 * Get favorite specs (pinned items)
 */
export function getFavoriteSpecs(): SpecHistoryItem[] {
  const history = loadSpecHistory();
  return history.items.filter(item => item.name.startsWith('⭐'));
}

/**
 * Toggle favorite status for a spec
 */
export function toggleFavorite(id: string): SpecHistory {
  const history = loadSpecHistory();
  const index = history.items.findIndex(item => item.id === id);
  
  if (index >= 0) {
    const item = history.items[index];
    if (item.name.startsWith('⭐')) {
      item.name = item.name.substring(2).trim();
    } else {
      item.name = `⭐ ${item.name}`;
    }
    item.updatedAt = new Date().toISOString();
    saveSpecHistory(history);
  }
  
  return history;
}
