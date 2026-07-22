import { mkdirSync, rmSync } from "fs";
import { dirname } from "path";
import { DatabaseSync } from "node:sqlite";
import { createStoriesTable } from "./schema";
import type { ArticleRecord } from "../helpers/sortAnalysis";

export function createMirrorDb(dbPath: string): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true });
  rmSync(dbPath, { force: true });
  const db = new DatabaseSync(dbPath);
  db.exec(createStoriesTable);
  return db;
}

function ingest(
  db: DatabaseSync,
  records: ArticleRecord[],
  rankColumn: "ui_rank" | "api_rank",
): void {
  const stmt = db.prepare(
    `INSERT INTO stories (id, title, author, unix_time, iso_time, ${rankColumn})
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET ${rankColumn} = excluded.${rankColumn}`,
  );
  db.exec("BEGIN");
  for (const record of records) {
    stmt.run(
      record.id,
      record.title,
      record.author ?? null,
      record.unixTime,
      record.isoTimestamp,
      record.rank,
    );
  }
  db.exec("COMMIT");
}

export function ingestUiStories(
  db: DatabaseSync,
  records: ArticleRecord[],
): void {
  ingest(db, records, "ui_rank");
}

export function ingestApiStories(
  db: DatabaseSync,
  records: ArticleRecord[],
): void {
  ingest(db, records, "api_rank");
}
