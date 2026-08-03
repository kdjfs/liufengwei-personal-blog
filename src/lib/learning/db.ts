import type { Annotation, ArticleProgress, AudioScript, LearningSetting } from './types.ts';

export const LEARNING_DB_NAME = 'lfw-learning-db';
export const LEARNING_DB_VERSION = 1;

export interface LearningStoreMap {
  articleProgress: ArticleProgress;
  annotations: Annotation;
  audioScripts: AudioScript;
  settings: LearningSetting;
}

export type LearningStoreName = keyof LearningStoreMap;

const STORE_KEYS: Record<LearningStoreName, string> = {
  articleProgress: 'articleSlug',
  annotations: 'id',
  audioScripts: 'cacheKey',
  settings: 'key',
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class LearningDatabase {
  private databasePromise?: Promise<IDBDatabase>;
  private readonly factory: IDBFactory;
  private readonly name: string;

  constructor(factory: IDBFactory, name = LEARNING_DB_NAME) {
    this.factory = factory;
    this.name = name;
  }

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.factory.open(this.name, LEARNING_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const [storeName, keyPath] of Object.entries(STORE_KEYS)) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName, { keyPath });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.databasePromise = undefined;
        reject(request.error ?? new Error('无法打开学习数据库'));
      };
      request.onblocked = () => {
        this.databasePromise = undefined;
        reject(new Error('学习数据库升级被其他页面阻止，请关闭旧页面后重试'));
      };
    });
    return this.databasePromise;
  }

  async get<K extends LearningStoreName>(
    storeName: K,
    key: IDBValidKey,
  ): Promise<LearningStoreMap[K] | undefined> {
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).get(key)) as Promise<
      LearningStoreMap[K] | undefined
    >;
  }

  async getAll<K extends LearningStoreName>(storeName: K): Promise<LearningStoreMap[K][]> {
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).getAll()) as Promise<
      LearningStoreMap[K][]
    >;
  }

  async put<K extends LearningStoreName>(storeName: K, value: LearningStoreMap[K]): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value);
    await transactionDone(transaction);
  }

  async putMany<K extends LearningStoreName>(
    storeName: K,
    values: LearningStoreMap[K][],
  ): Promise<void> {
    if (values.length === 0) return;
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    for (const value of values) store.put(value);
    await transactionDone(transaction);
  }

  async delete(storeName: LearningStoreName, key: IDBValidKey): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(key);
    await transactionDone(transaction);
  }

  async clear(storeName: LearningStoreName): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).clear();
    await transactionDone(transaction);
  }

  async clearAll(): Promise<void> {
    const database = await this.open();
    const stores = Object.keys(STORE_KEYS) as LearningStoreName[];
    const transaction = database.transaction(stores, 'readwrite');
    for (const storeName of stores) transaction.objectStore(storeName).clear();
    await transactionDone(transaction);
  }

  async getStoreNames(): Promise<string[]> {
    const database = await this.open();
    return [...database.objectStoreNames].sort();
  }

  close(): void {
    this.databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.databasePromise = undefined;
  }
}

let browserDatabase: LearningDatabase | undefined;

export function getLearningDatabase(): LearningDatabase {
  if (browserDatabase) return browserDatabase;
  if (typeof indexedDB === 'undefined') throw new Error('当前环境不支持 IndexedDB');
  browserDatabase = new LearningDatabase(indexedDB);
  return browserDatabase;
}
