import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, "../../../data/base.db");
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultDbPath;

sqlite3.verbose();

let db;

export function getDb() {
  if (!db) {
    db = new sqlite3.Database(databasePath);
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

export function closeDb() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    db.close((error) => {
      if (error) reject(error);
      else {
        db = undefined;
        resolve();
      }
    });
  });
}
