import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function manejadorErrores(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  console.error('[Error]', err)

  if (err instanceof ZodError) {
    const errores = err.errors.map((e) => ({
      campo: e.path.join('.'),
      mensaje: e.message,
    }))
    return res.status(400).json({
      error: 'Los datos enviados son inválidos.',
      errores,
    })
  }

  return res.status(500).json({
    error: 'Ocurrió un error interno. Intentá de nuevo en un momento.',
  })
}
