-- Invites table for invite-based onboarding flow
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
);
