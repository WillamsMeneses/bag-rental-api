import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const { statusCode } = response;
          const contentLength = response.get('content-length');
          const delay = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${contentLength} - ${userAgent} ${ip} +${delay}ms`,
          );
        },
        error: (error: Error): void => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${error.message} - ${userAgent} ${ip} +${delay}ms`,
          );
        },
      }),
    );
  }
}
