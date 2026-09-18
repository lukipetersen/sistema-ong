-- Crear usuario administrador: Facundo Petersen
INSERT INTO "usuarios" ("id", "cuil", "nombre", "apellido", "email", "password", "rol", "activo", "creadoEn", "actualizadoEn")
VALUES (
  'usr-facundo-petersen-001',
  '20-99999901-5',
  'Facundo',
  'Petersen',
  'facundope@icloud.com',
  '$2b$12$8SUs9DDy5bHyHZ9V8TvdG.aOBlQ1b7KXHvyRIhKZbdKvPsGCXoAYG',
  'ADMINISTRADOR',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Crear usuario solo Stock: FlorVida
INSERT INTO "usuarios" ("id", "cuil", "nombre", "apellido", "email", "password", "rol", "activo", "creadoEn", "actualizadoEn")
VALUES (
  'usr-florvida-stock-001',
  '30-99999902-3',
  'FlorVida',
  'Asoc.',
  'asoflorvida@gmail.com',
  '$2b$12$nErgrLm7KKLrPnojJKLu8.wq9/Mx85TGFvsty6zaVkS0xgMEKDhrG',
  'SOLO_STOCK',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
