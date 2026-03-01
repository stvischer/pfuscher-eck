-- Additional chat seed users (password: "password")
INSERT IGNORE INTO users (username, email, password, role) VALUES
  ('chat1', 'chat1@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'user'),
  ('chat2', 'chat2@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'user'),
  ('chat3', 'chat3@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'user');
