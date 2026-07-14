import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Catches errors originating from Stellar SDK / Horizon API calls.
 *
 * Stellar SDK errors typically have:
 * - response.data.title (e.g., "Bad Request")
 * - response.data.detail (e.g., "Transaction failed")
 * - response.status (HTTP status from Horizon)
 *
 * TODO: Once StellarService is implemented, map Stellar-specific error codes:
 * - Transaction failed → 422 Unprocessable Entity
 * - Account not found → 404 Not Found
 * - Network/Horizon timeout → 503 Service Unavailable
 * - Rate limited → 429 Too Many Requests
 */
@Catch()
export class StellarExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StellarExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if this is a Stellar SDK error
    const isStellarError =
      exception instanceof Error &&
      (exception.name === 'NotFoundError' ||
        exception.name === 'BadRequestError' ||
        exception.name === 'TimeoutError' ||
        (exception as any).response?.data?.title);

    if (!isStellarError) {
      // Not a Stellar error — let the global AllExceptionsFilter handle it
      return;
    }

    const stellarException = exception as any;
    const horizonStatus = stellarException.response?.status;
    const horizonTitle = stellarException.response?.data?.title;

    let status = HttpStatus.BAD_GATEWAY;
    if (horizonStatus === 404) status = HttpStatus.NOT_FOUND;
    else if (horizonStatus === 400) status = HttpStatus.BAD_REQUEST;
    else if (horizonStatus === 429) status = HttpStatus.TOO_MANY_REQUESTS;

    this.logger.error(
      `Stellar API error: ${horizonTitle || exception.message} (${request.method} ${request.url})`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Stellar API Error',
      message:
        stellarException.message ||
        'Failed to communicate with Stellar network',
    });
  }
}
