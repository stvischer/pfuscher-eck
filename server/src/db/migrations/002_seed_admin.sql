-- Only seed if no users exist yet
INSERT INTO users (username, email, password, role)
SELECT 'admin', 'admin@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@pfuscher.at');

INSERT INTO users (username, email, password, role)
SELECT 'user', 'user@pfuscher.at', '$2b$12$KT5gmxadObp41/G8h6nogOk1T9bZLrLSCpTfw.CNud6fX1dyZE.Dy', 'user'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@pfuscher.at');
