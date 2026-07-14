import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Auth API — handles the "Verify with Verity" OAuth-style popup flow.
 *
 * This is how third-party apps verify a user without seeing their
 * wallet address, documents, or transaction history.
 *
 * Flow:
 * 1. Third-party app opens popup → POST /auth/sessions (creates session)
 * 2. User sees consent screen in popup → POST /auth/sessions/:token/approve
 * 3. Popup sends postMessage({ token }) back to third-party app
 * 4. Third-party app exchanges token → POST /auth/tokens/verify
 * 5. Returns { verified: true/false } — nothing else
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Create an authorization session.
   *
   * TODO: Implement
   * - Generate a short-lived session token (UUID or JWT)
   * - Store AuthorizationSession with status='pending'
   * - Set expiry from SESSION_EXPIRY_MINUTES env var
   * - Return { token, expiresAt }
   */
  @Post('sessions')
  async createSession(
    @Body()
    _body: {
      didAddress: string;
      appName: string;
      appUrl: string;
      requestedClaims: Record<string, unknown>;
    },
  ) {
    this.logger.warn('createSession not yet implemented');
    return { message: 'TODO: Create auth session — see auth.service.ts' };
  }

  /**
   * Get session status (used by popup page to check state).
   *
   * TODO: Implement
   * - Look up session by token
   * - Return { status, appName, requestedClaims }
   * - Check if session has expired
   */
  @Get('sessions/:token')
  async getSession(@Param('token') _token: string) {
    this.logger.warn('getSession not yet implemented');
    return { message: 'TODO: Get session status — see auth.service.ts' };
  }

  /**
   * User approves sharing their verified status.
   *
   * TODO: Implement
   * - Load session by token
   * - Validate session is pending and not expired
   * - Set status='approved', resolvedAt=now
   * - Return { verified: true } to be sent via postMessage
   */
  @Post('sessions/:token/approve')
  async approveSession(@Param('token') _token: string) {
    this.logger.warn('approveSession not yet implemented');
    return { message: 'TODO: Approve session — see auth.service.ts' };
  }

  /**
   * User denies the request.
   *
   * TODO: Implement
   * - Load session by token
   * - Set status='denied', resolvedAt=now
   * - Return { verified: false }
   */
  @Post('sessions/:token/deny')
  async denySession(@Param('token') _token: string) {
    this.logger.warn('denySession not yet implemented');
    return { message: 'TODO: Deny session — see auth.service.ts' };
  }

  /**
   * Third-party app verifies the returned token.
   *
   * TODO: Implement
   * - Load session by token
   * - Validate session is approved and not expired
   * - Return { verified: true, did: "..." } — the app only gets
   *   the verification signal and a DID reference, never the wallet address
   */
  @Post('tokens/verify')
  async verifyToken(@Body() _body: { token: string }) {
    this.logger.warn('verifyToken not yet implemented');
    return { message: 'TODO: Verify token — see auth.service.ts' };
  }
}
