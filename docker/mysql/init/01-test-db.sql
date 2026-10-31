-- Runs once, the first time the db_data volume is initialized by the official MySQL image.
-- Creates the separate test database and grants the app user access to it, so tests
-- never need to touch the main database.

CREATE DATABASE IF NOT EXISTS srct_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON srct_test.* TO 'srct'@'%';
FLUSH PRIVILEGES;
