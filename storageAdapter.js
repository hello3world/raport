/**
 * Storage Adapter - обеспечивает абстракцию над localStorage и IndexedDB
 * Автоматически переключается на IndexedDB при превышении лимитов localStorage
 */

class StorageAdapter {
    constructor() {
        this.useIndexedDB = false;
        this.dbName = 'ReportFormDB';
        this.dbVersion = 1;
        this.storeName = 'drafts';
        this.db = null;
        this.init();
    }

    async init() {
        // Проверяем доступность localStorage
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (e) {
            console.warn('localStorage недоступен, переключаемся на IndexedDB');
            this.useIndexedDB = true;
        }

        // Инициализируем IndexedDB если нужно
        if (this.useIndexedDB) {
            await this.initIndexedDB();
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Ошибка инициализации IndexedDB');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
        });
    }

    async setItem(key, value) {
        try {
            if (this.useIndexedDB) {
                return await this.setIndexedDBItem(key, value);
            } else {
                return this.setLocalStorageItem(key, value);
            }
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            // Пытаемся переключиться на IndexedDB
            if (!this.useIndexedDB) {
                console.warn('Переключаемся на IndexedDB из-за ошибки localStorage');
                this.useIndexedDB = true;
                await this.initIndexedDB();
                return await this.setIndexedDBItem(key, value);
            }
            throw error;
        }
    }

    async getItem(key) {
        try {
            if (this.useIndexedDB) {
                return await this.getIndexedDBItem(key);
            } else {
                return this.getLocalStorageItem(key);
            }
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            return null;
        }
    }

    async removeItem(key) {
        try {
            if (this.useIndexedDB) {
                return await this.removeIndexedDBItem(key);
            } else {
                return this.removeLocalStorageItem(key);
            }
        } catch (error) {
            console.error('Ошибка удаления данных:', error);
            throw error;
        }
    }

    async getAllItems() {
        try {
            if (this.useIndexedDB) {
                return await this.getAllIndexedDBItems();
            } else {
                return this.getAllLocalStorageItems();
            }
        } catch (error) {
            console.error('Ошибка получения всех данных:', error);
            return [];
        }
    }

    // Методы для localStorage
    setLocalStorageItem(key, value) {
        const data = JSON.stringify(value);
        localStorage.setItem(key, data);
        return Promise.resolve();
    }

    getLocalStorageItem(key) {
        const data = localStorage.getItem(key);
        return Promise.resolve(data ? JSON.parse(data) : null);
    }

    removeLocalStorageItem(key) {
        localStorage.removeItem(key);
        return Promise.resolve();
    }

    getAllLocalStorageItems() {
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('draft-')) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        items.push(JSON.parse(data));
                    } catch (e) {
                        console.warn(`Некорректные данные в ключе ${key}`);
                    }
                }
            }
        }
        return Promise.resolve(items);
    }

    // Методы для IndexedDB
    async setIndexedDBItem(key, value) {
        if (!this.db) {
            await this.initIndexedDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put({ id: key, ...value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getIndexedDBItem(key) {
        if (!this.db) {
            await this.initIndexedDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    const { id, ...data } = result;
                    resolve(data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async removeIndexedDBItem(key) {
        if (!this.db) {
            await this.initIndexedDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllIndexedDBItems() {
        if (!this.db) {
            await this.initIndexedDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result.map(item => {
                    const { id, ...data } = item;
                    return data;
                });
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Утилиты для работы с файлами
    async saveFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: reader.result,
                    lastModified: file.lastModified
                };
                resolve(fileData);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    // Генерация уникальных ID
    generateId() {
        return 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Проверка размера данных
    getDataSize(data) {
        return new Blob([JSON.stringify(data)]).size;
    }

    // Очистка старых черновиков (старше указанного количества дней)
    async cleanupOldDrafts(daysOld = 30) {
        try {
            const allItems = await this.getAllItems();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const itemsToDelete = allItems.filter(item => {
                const itemDate = new Date(item.updatedAt);
                return itemDate < cutoffDate && item.status === 'draft';
            });

            for (const item of itemsToDelete) {
                await this.removeItem(item.id);
            }

            console.log(`Удалено ${itemsToDelete.length} старых черновиков`);
            return itemsToDelete.length;
        } catch (error) {
            console.error('Ошибка очистки старых черновиков:', error);
            return 0;
        }
    }

    // Экспорт/импорт данных
    async exportData() {
        try {
            const allItems = await this.getAllItems();
            const exportData = {
                version: 1,
                exportDate: new Date().toISOString(),
                items: allItems
            };
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            throw error;
        }
    }

    async importData(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            if (!importData.items || !Array.isArray(importData.items)) {
                throw new Error('Некорректный формат данных для импорта');
            }

            let imported = 0;
            for (const item of importData.items) {
                if (item.id && item.status) {
                    await this.setItem(item.id, item);
                    imported++;
                }
            }

            console.log(`Импортировано ${imported} элементов`);
            return imported;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
window.storageAdapter = new StorageAdapter();