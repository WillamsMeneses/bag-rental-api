import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest para NO lanzar error si no hay token
  handleRequest(err: any, user: any) {
    // Si hay error o no hay usuario, simplemente retorna null
    // NO lanza excepción
    return user || null;
  }
}
