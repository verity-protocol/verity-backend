import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationSession } from './entities/authorization-session.entity';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AuthorizationSession)
    private readonly sessionRepository: Repository<AuthorizationSession>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new authorization session.
   *
   * TODO: Implement:
   * 1. Validate the DID address exists (via DidService)
   * 2. Generate a unique session token (UUID)
   * 3. Calculate expiry from SESSION_EXPIRY_MINUTES config
   * 4. Save AuthorizationSession with status='pending'
   * 5. Return { token, expiresAt }
   */
  async createSession(
    _didAddress: string,
    _appName: string,
    _appUrl: string,
    _requestedClaims: Record<string, unknown>,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiryMinutes =
      this.configService.get<number>('app.sessionExpiryMinutes') || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // TODO: Save session to database
    this.logger.warn('AuthService.createSession not yet implemented');
    return { token, expiresAt };
  }

  /**
   * Get session by token.
   *
   * TODO: Implement:
   * 1. Look up session by token
   * 2. If not found, throw NotFoundException
   * 3. If expired, throw GoneException (410)
   * 4. Return session with status and requestedClaims
   */
  async getSession(_token: string): Promise<AuthorizationSession> {
    this.logger.warn('AuthService.getSession not yet implemented');
    throw new NotFoundException('Session not found');
  }

  /**
   * Approve a session (user clicked approve in popup).
   *
   * TODO: Implement:
   * 1. Load session by token
   * 2. Validate status is 'pending' and not expired
   * 3. Set status='approved', resolvedAt=now
   * 4. Save to database
   * 5. Optionally create a ConnectedApp record for the third-party app
   */
  async approveSession(_token: string): Promise<{ verified: boolean }> {
    this.logger.warn('AuthService.approveSession not yet implemented');
    return { verified: true };
  }

  /**
   * Deny a session (user clicked deny in popup).
   *
   * TODO: Implement:
   * 1. Load session by token
   * 2. Set status='denied', resolvedAt=now
   * 3. Save to database
   */
  async denySession(_token: string): Promise<{ verified: boolean }> {
    this.logger.warn('AuthService.denySession not yet implemented');
    return { verified: false };
  }

  /**
   * Verify a token (third-party app exchanges for verification signal).
   *
   * TODO: Implement:
   * 1. Load session by token
   * 2. Validate session is approved
   * 3. Validate session is not expired
   * 4. Return { verified: true, did: "..." }
   *
   * SECURITY: This endpoint is the only way third-party apps learn
   * a user's verification status. They never see the wallet address.
   */
  async verifyToken(
    _token: string,
  ): Promise<{ verified: boolean; did?: string }> {
    this.logger.warn('AuthService.verifyToken not yet implemented');
    return { verified: false };
  }
}
