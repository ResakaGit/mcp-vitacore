/**
 * Adaptador SQLite para StoragePort (better-sqlite3).
 * Crea DB y tablas si no existen; exporta factory createStorageAdapter(dbPath).
 */
import Database from "better-sqlite3";
import type { StoragePort } from "../../ports/storage.js";
export declare function initSchema(db: Database.Database): void;
export declare function createStorageAdapter(dbPath: string): StoragePort;
//# sourceMappingURL=storageAdapter.d.ts.map