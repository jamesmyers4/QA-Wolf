export const createStoriesTable = `
CREATE TABLE stories (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  unix_time INTEGER NOT NULL,
  iso_time TEXT NOT NULL,
  ui_rank INTEGER,
  api_rank INTEGER
)`;
