import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PrepareCreateDidDto {
  @IsString()
  @IsNotEmpty()
  ownerAddress: string;

  @IsString()
  @IsOptional()
  nullifierHash?: string;
}

export class PrepareLinkDidDto {
  @IsString()
  @IsNotEmpty()
  didIdentifier: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class PrepareUnlinkDidDto {
  @IsString()
  @IsNotEmpty()
  didIdentifier: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  callerAddress: string;
}

export class ConfirmCreateDidDto {
  @IsString()
  @IsNotEmpty()
  txXdr: string;

  @IsString()
  @IsOptional()
  nullifierHash?: string;
}

export class ConfirmLinkDidDto {
  @IsString()
  @IsNotEmpty()
  txXdr: string;
}

export class ConfirmUnlinkDidDto {
  @IsString()
  @IsNotEmpty()
  txXdr: string;
}

export class SetVerificationDto {
  @IsBoolean()
  @IsNotEmpty()
  isVerified: boolean;
}
