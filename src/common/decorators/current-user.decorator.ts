import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usa CLASS en lugar de interface
export class CurrentUserData {
  id: string;
  email: string;
  authProvider: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentUserData;
  },
);
