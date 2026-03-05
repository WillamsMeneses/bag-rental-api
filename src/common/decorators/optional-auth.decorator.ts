import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OptionalUserData {
  id?: string;
  email?: string;
  authProvider?: string;
}

/**
 * Decorator para obtener usuario opcional (puede ser null si no está autenticado)
 * Usado en endpoints públicos que necesitan saber si hay usuario logueado
 */
export const OptionalUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OptionalUserData | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user || null;
  },
);
