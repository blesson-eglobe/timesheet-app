-- ─── MySQL Schema for WAMP Server ──────────────────────────────────────────────

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36) PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(180) UNIQUE NOT NULL,
  username      VARCHAR(100) UNIQUE NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL,
  department    VARCHAR(100) NOT NULL DEFAULT '',
  designation   VARCHAR(100) NOT NULL DEFAULT '',
  initials      VARCHAR(4) NOT NULL DEFAULT '',
  color         VARCHAR(20) NOT NULL DEFAULT '#2563EB',
  avatar        VARCHAR(500) NOT NULL DEFAULT '',
  status        VARCHAR(20) NOT NULL DEFAULT 'Active',
  reporting_manager_id VARCHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporting_manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id               VARCHAR(36) PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  status           VARCHAR(50) NOT NULL DEFAULT 'Not Started',
  priority         VARCHAR(20) NOT NULL DEFAULT 'Medium',
  project_type     VARCHAR(20) NOT NULL DEFAULT 'Billable',
  start_date       DATE NULL,
  end_date         DATE NULL,
  estimated_hours  DECIMAL(8,2) NOT NULL DEFAULT 0,
  logged_hours     DECIMAL(8,2) NOT NULL DEFAULT 0,
  progress         INT NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Project Members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  project_id VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Work Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_logs (
  id               VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(36) NOT NULL,
  project_id       VARCHAR(36) NOT NULL,
  task_name        VARCHAR(255) NOT NULL,
  task_description TEXT,
  date             DATE NOT NULL,
  hours            DECIMAL(4,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'In Progress',
  task_status      VARCHAR(20) NOT NULL DEFAULT 'In Progress',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Tickets ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id            VARCHAR(36) PRIMARY KEY,
  ticket_number VARCHAR(100) NOT NULL,
  ticket_url    VARCHAR(500) NOT NULL DEFAULT '',
  provider      VARCHAR(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Work Log Tickets (join) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_log_tickets (
  work_log_id VARCHAR(36) NOT NULL,
  ticket_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (work_log_id, ticket_id),
  FOREIGN KEY (work_log_id) REFERENCES work_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Timesheets ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timesheets (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  week_start   DATE NOT NULL,
  week_end     DATE NOT NULL,
  total_hours  DECIMAL(6,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'Draft',
  submitted_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_week (user_id, week_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Approvals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id           VARCHAR(36) PRIMARY KEY,
  timesheet_id VARCHAR(36) NOT NULL,
  manager_id   VARCHAR(36) NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'Pending',
  comments     TEXT,
  approved_at  DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  type         VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  link         VARCHAR(500) NOT NULL DEFAULT '',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Settings / User Preferences ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id                VARCHAR(36) PRIMARY KEY,
  daily_hours_target     DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  timezone               VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  week_start_day         VARCHAR(20) NOT NULL DEFAULT 'Monday',
  notif_submission       BOOLEAN NOT NULL DEFAULT TRUE,
  notif_approval         BOOLEAN NOT NULL DEFAULT TRUE,
  notif_reminder         BOOLEAN NOT NULL DEFAULT TRUE,
  email_notif_approvals  BOOLEAN NOT NULL DEFAULT TRUE,
  email_notif_reminders  BOOLEAN NOT NULL DEFAULT TRUE,
  email_notif_weekly     BOOLEAN NOT NULL DEFAULT FALSE,
  default_view           VARCHAR(20) NOT NULL DEFAULT 'week',
  theme                  VARCHAR(20) NOT NULL DEFAULT 'system',
  working_hours_per_day  DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- ─── Invites ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id            CHAR(36)      NOT NULL,
  email         VARCHAR(191)  NOT NULL,
  role          ENUM('employee','manager','admin') NOT NULL DEFAULT 'employee',
  department    VARCHAR(100)  NOT NULL DEFAULT 'Engineering',
  token         TEXT          NOT NULL,
  token_hash    CHAR(64)      NOT NULL,
  invited_by    CHAR(36)      NOT NULL,
  used_at       DATETIME      DEFAULT NULL,
  expires_at    DATETIME      NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invites_token_hash (token_hash),
  INDEX idx_invites_email (email)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

