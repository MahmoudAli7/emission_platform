import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let code: string;
    let message: string;
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      code = status.toString();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message || 'Unknown error';
        details = resp.details || resp.error;
      } else {
        message = String(exceptionResponse) || 'Unknown error';
      }
    } else if (exception instanceof Error) {
      code = 'INTERNAL_SERVER_ERROR';
      message = exception.message;
    } else {
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred';
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    });
  }
}

