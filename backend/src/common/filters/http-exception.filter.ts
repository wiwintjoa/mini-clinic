import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof details === 'object' && details ? details as Record<string, unknown> : {};
    response.status(status).json({ statusCode: status, message: status === 500 ? 'Internal server error' : body.message ?? details, errors: body.errors, requestId: request.headers['x-request-id'] });
  }
}
