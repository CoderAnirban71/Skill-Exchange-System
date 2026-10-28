-- SkillBarter database schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS skillbarter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillbarter;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio           VARCHAR(200) NOT NULL DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- One row per skill a user lists. kind: 'offer' = I can teach, 'want' = I want to learn.
-- The unique key (user_id, name) is case-insensitive (utf8mb4_unicode_ci), so a skill
-- can't appear twice for one user, even across the two lists.
CREATE TABLE IF NOT EXISTS user_skills (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  kind       ENUM('offer','want') NOT NULL,
  name       VARCHAR(40)  NOT NULL,
  level      ENUM('beginner','intermediate','advanced') NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_skill (user_id, name),
  KEY idx_skill_name (name),
  CONSTRAINT fk_skill_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- offer_skill = what the sender teaches, want_skill = what the receiver teaches.
CREATE TABLE IF NOT EXISTS swap_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender_id    INT UNSIGNED NOT NULL,
  receiver_id  INT UNSIGNED NOT NULL,
  offer_skill  VARCHAR(40)  NOT NULL,
  want_skill   VARCHAR(40)  NOT NULL,
  message      VARCHAR(300) NOT NULL DEFAULT '',
  status       ENUM('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME     NULL,
  KEY idx_req_sender (sender_id, status),
  KEY idx_req_receiver (receiver_id, status),
  CONSTRAINT fk_req_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_req_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
