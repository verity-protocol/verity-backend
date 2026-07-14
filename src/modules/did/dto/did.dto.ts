import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDidDto {
  @IsString()
  @IsNotEmpty()
  ownerAddress: string;

  @IsString()
  @IsOptional()
  nullifierHash?: string;
}

export class LinkWalletDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class UnlinkWalletDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class SetVerificationDto {
  @IsNotEmpty()
  isVerified: boolean;
}
