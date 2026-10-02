-- Recalculate stock with the corrected model:
--
-- stockGramos (stock total) changes on:
--   STOCK_TOTAL INGRESO → +cantidadGramos
--   STOCK_TOTAL EGRESO  → -cantidadGramos
--   DISPENSARIO EGRESO  → -cantidadGramos  (dispensation reduces total stock)
--   DISPENSARIO INGRESO → no change        (transfer is internal, not a loss)
--
-- stockGramosDispensario changes on:
--   DISPENSARIO INGRESO → +cantidadGramos
--   DISPENSARIO EGRESO  → -cantidadGramos

UPDATE "geneticas" g
SET "stockGramos" = COALESCE((
  SELECT SUM(
    CASE
      WHEN m."seccion" = 'STOCK_TOTAL' AND m."tipo" = 'INGRESO' THEN  m."cantidadGramos"
      WHEN m."seccion" = 'STOCK_TOTAL' AND m."tipo" = 'EGRESO'  THEN -m."cantidadGramos"
      WHEN m."seccion" = 'DISPENSARIO' AND m."tipo" = 'EGRESO'  THEN -m."cantidadGramos"
      ELSE 0
    END
  )
  FROM "movimientos_stock" m
  WHERE m."geneticaId" = g.id
), 0);

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
  WHERE m."geneticaId" = g.id
), 0);
