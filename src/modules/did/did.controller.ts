import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DidService, PrepareDidResult } from './did.service';
import {
  ConfirmCreateDidDto,
  ConfirmLinkDidDto,
  ConfirmUnlinkDidDto,
  PrepareCreateDidDto,
  PrepareLinkDidDto,
  PrepareUnlinkDidDto,
  SetVerificationDto,
} from './dto/did.dto';

@ApiTags('did')
@Controller('did')
export class DidController {
  private readonly logger = new Logger(DidController.name);

  constructor(private readonly didService: DidService) {}

  @Post('prepare')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Prepare DID creation',
    description:
      'Returns a simulated transaction for the client to sign out-of-band. ' +
      'The returned validUntilLedger is the deadline for confirm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prepared transaction ready for signing',
  })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async prepareCreate(
    @Body() body: PrepareCreateDidDto,
  ): Promise<PrepareDidResult> {
    return this.didService.prepareCreate(body.ownerAddress);
  }

  @Post('prepare/link')
  @HttpCode(200)
  @ApiOperation({ summary: 'Prepare linking a wallet to a DID' })
  @ApiResponse({
    status: 200,
    description: 'Prepared transaction ready for signing',
  })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async prepareLink(
    @Body() body: PrepareLinkDidDto,
  ): Promise<PrepareDidResult> {
    return this.didService.prepareLink(body.didIdentifier, body.walletAddress);
  }

  @Post('prepare/unlink')
  @HttpCode(200)
  @ApiOperation({ summary: 'Prepare removing a wallet from a DID' })
  @ApiResponse({
    status: 200,
    description: 'Prepared transaction ready for signing',
  })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async prepareUnlink(
    @Body() body: PrepareUnlinkDidDto,
  ): Promise<PrepareDidResult> {
    return this.didService.prepareUnlink(
      body.didIdentifier,
      body.walletAddress,
      body.callerAddress,
    );
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm DID creation with a user-signed transaction',
  })
  @ApiResponse({ status: 201, description: 'DID created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction XDR' })
  @ApiResponse({
    status: 409,
    description: 'Prepared transaction expired or contention',
  })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async confirmCreate(@Body() body: ConfirmCreateDidDto) {
    return this.didService.confirmCreate(body);
  }

  @Post('confirm/link')
  @ApiOperation({
    summary: 'Confirm linking a wallet with a user-signed transaction',
  })
  @ApiResponse({ status: 201, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction XDR' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({
    status: 409,
    description: 'Prepared transaction expired or contention',
  })
  async confirmLink(@Body() body: ConfirmLinkDidDto) {
    return this.didService.confirmLink(body);
  }

  @Post('confirm/unlink')
  @ApiOperation({
    summary: 'Confirm removing a wallet with a user-signed transaction',
  })
  @ApiResponse({ status: 201, description: 'Wallet removed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction XDR' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({
    status: 409,
    description: 'Prepared transaction expired or contention',
  })
  async confirmUnlink(@Body() body: ConfirmUnlinkDidDto) {
    return this.didService.confirmUnlink(body);
  }

  @Get('wallet/:address')
  @ApiOperation({
    summary: 'Find a DID by wallet address (chain-authoritative)',
    description:
      'Queries the did_registry contract first; the database record is only ' +
      'returned if the chain still maps the wallet to that DID.',
  })
  @ApiResponse({ status: 200, description: 'DID found for wallet' })
  @ApiResponse({ status: 404, description: 'No DID found for wallet' })
  async findByWallet(@Param('address') address: string) {
    const record = await this.didService.findByWallet(address);
    if (!record) {
      throw new NotFoundException(`No DID found for wallet ${address}`);
    }
    return record;
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Resolve a DID to its verification document' })
  @ApiResponse({ status: 200, description: 'DID resolution document returned' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async resolveDid(@Param('identifier') identifier: string) {
    return this.didService.resolve(identifier);
  }

  @Get(':identifier/wallets')
  @ApiOperation({ summary: 'List wallets linked to a DID' })
  @ApiResponse({ status: 200, description: 'List of linked wallets' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async listWallets(@Param('identifier') identifier: string) {
    return this.didService.listWallets(identifier);
  }

  @Patch(':identifier/verification')
  @ApiOperation({ summary: 'Set verification status of a DID (admin-only)' })
  @ApiResponse({ status: 200, description: 'Verification status updated' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async setVerification(
    @Param('identifier') identifier: string,
    @Body() body: SetVerificationDto,
  ) {
    return this.didService.setVerification(identifier, body.isVerified);
  }
}
