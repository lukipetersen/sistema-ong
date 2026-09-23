-- Add modulosPermitidos column to usuarios
ALTER TABLE "usuarios" ADD COLUMN "modulosPermitidos" TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing SOLO_STOCK users: give them explicit stock-only access
UPDATE "usuarios" SET "modulosPermitidos" = ARRAY['/stock'] WHERE rol = 'SOLO_STOCK';
