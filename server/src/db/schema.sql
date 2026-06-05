CREATE TABLE IF NOT EXISTS global_orientation_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS global_test_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  hint TEXT,
  FOREIGN KEY (test_id) REFERENCES global_orientation_tests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS global_test_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  tags_json TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES global_test_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS global_result_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  primary_tags_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  reason_template TEXT NOT NULL,
  tags_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_professions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enterprise_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  competencies_json TEXT NOT NULL,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_game_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enterprise_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_game_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  visual_json TEXT NOT NULL,
  feedback TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES enterprise_game_scenarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_game_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  points INTEGER NOT NULL,
  is_preferred INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES enterprise_game_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_game_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  task_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES enterprise_game_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  enterprise_id INTEGER,
  global_profile_json TEXT NOT NULL,
  enterprise_result_json TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS seed_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
