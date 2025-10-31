// Type definitions for StorageAdapter
interface StorageAdapter {
  init(): Promise<void>;
  setItem(key: string, value: any): Promise<void>;
  getItem(key: string): Promise<any>;
  removeItem(key: string): Promise<void>;
  getAllItems(): Promise<any[]>;
  saveFile(file: File): Promise<any>;
  generateId(formType?: string): string;
  cleanupOldDrafts(daysOld?: number): Promise<number>;
  exportData(): Promise<string>;
  importData(jsonData: string): Promise<number>;
}

// Extend the Window interface to include storageAdapter
interface Window {
  storageAdapter: StorageAdapter;
}