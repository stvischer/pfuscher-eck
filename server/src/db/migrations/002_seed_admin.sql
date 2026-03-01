-- Clear all existing users and insert fresh seed data
DELETE FROM users;

INSERT INTO users (username, email, password, role) VALUES
  ('admin', 'admin@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'admin'),
  ('user',  'user@pfuscher.at',  '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'user');
