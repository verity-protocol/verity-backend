import { HttpException, HttpStatus } from '@nestjs/common';
import { StrKey } from '@stellar/stellar-sdk';

export const DID_PREFIX = 'did:verity:';
export const DID_HEX_LENGTH = 64;

export class InvalidDidFormatError extends HttpException {
  constructor(
    message = `Invalid DID format: expected ${DID_PREFIX}<64 lowercase hex characters>`,
  ) {
    super({ message }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export function normalizeDidIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || !identifier.startsWith(DID_PREFIX)) {
    throw new InvalidDidFormatError();
  }
  const hex = identifier.slice(DID_PREFIX.length);
  if (hex.length !== DID_HEX_LENGTH || !/^[0-9a-f]+$/.test(hex)) {
    throw new InvalidDidFormatError();
  }
  return hex;
}

export function toCanonicalDid(hex: string): string {
  return `${DID_PREFIX}${hex}`;
}

export function isValidStellarAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}
