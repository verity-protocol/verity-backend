import { IsNotEmpty, IsString } from 'class-validator';

export class IssueCredentialDto {
  @IsString()
  @IsNotEmpty()
  did: string;

  @IsString()
  @IsNotEmpty()
  credentialType: string;

  @IsString()
  @IsNotEmpty()
  credentialHash: string;
}

export class RevokeCredentialDto {
  @IsString()
  @IsNotEmpty()
  issuerAddress: string;
}
