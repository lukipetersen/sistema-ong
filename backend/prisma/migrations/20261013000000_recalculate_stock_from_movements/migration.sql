-- Recalculate stockGramos for all genetics using the correct model:
-- STOCK_TOTAL INGRESO → +stockGramos
-- STOCK_TOTAL EGRESO  → -stockGramos
-- DISPENSARIO INGRESO → -stockGramos (transfer out of warehouse)
-- DISPENSARIO EGRESO  → no effect on stockGramos

UPDATE "geneticas" g
SET "stockGramos" = COALESCE((
  SELECT SUM(
    CASE
      WHEN m."seccion" = 'STOCK_TOTAL' AND m."tipo" = 'INGRESO' THEN  m."cantidadGramos"
      WHEN m."seccion" = 'STOCK_TOTAL' AND m."tipo" = 'EGRESO'  THEN -m."cantidadGramos"
      WHEN m."seccion" = 'DISPENSARIO' AND m."tipo" = 'INGRESO' THEN -m."cantidadGramos"
      ELSE 0
    END
  )
  FROM "movimientos_stock" m
  WHERE m."geneticaId" = g."id"
), 0);

-- Recalculate stockGramosDispensario:
-- DISPENSARIO INGRESO → +stockGramosDispensario
-- DISPENSARIO EGRESO  → -stockGramosDispensario

UPDATE "geneticas" g
SET "stockGramosDispensario" = COALESCE((
  SELECT SUM(
    CASE
      WHEN m."seccion" = 'DISPENSARIO' AND m."tipo" = 'INGRESO' THEN  m."cantidadGramos"
      WHEN m."seccion" = 'DISPENSARIO' AND m."tipo" = 'EGRESO'  THEN -m."cantidadGramos"
      ELSE 0
    END
  )
  FROM "movimientos_stock" m
  WHERE m."geneticaId" = g."id"
), 0);
