import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export function registrarAuditoria(accion: string, entidad: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const respuestaOriginal = res.json.bind(res)

    res.json = (body: unknown) => {
      // Solo registra si la respuesta fue exitosa (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entidadId =
          req.params.id ||
          (body as Record<string, unknown>)?.id as string ||
          undefined

        prisma.auditoria
          .create({
            data: {
              usuarioId: req.usuarioId || null,
              accion,
              entidad,
              entidadId: typeof entidadId === 'string' ? entidadId : undefined,
              detalles: req.method !== 'GET' ? req.body as object : undefined,
              ip: req.ip,
            },
          })
          .catch((err: Error) => console.error('Error al registrar auditoría:', err))
      }
      return respuestaOriginal(body)
    }

    next()
  }
}
