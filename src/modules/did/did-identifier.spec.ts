import {
  DID_PREFIX,
  InvalidDidFormatError,
  isValidStellarAddress,
  normalizeDidIdentifier,
  toCanonicalDid,
} from './did-identifier';

describe('did-identifier', () => {
  const HEX = 'a'.repeat(64);

  describe('normalizeDidIdentifier', () => {
    it('should strip the canonical prefix and return lowercase hex', () => {
      expect(normalizeDidIdentifier(`did:verity:${HEX}`)).toBe(HEX);
    });

    it('should accept a raw 64-char hex prefixed form only', () => {
      expect(() => normalizeDidIdentifier(HEX)).toThrow(InvalidDidFormatError);
    });

    it('should reject an unknown prefix', () => {
      expect(() => normalizeDidIdentifier(`did:other:${HEX}`)).toThrow(
        InvalidDidFormatError,
      );
      expect(() => normalizeDidIdentifier(`verity:${HEX}`)).toThrow(
        InvalidDidFormatError,
      );
    });

    it('should reject uppercase hex', () => {
      expect(() =>
        normalizeDidIdentifier(`did:verity:${HEX.toUpperCase()}`),
      ).toThrow(InvalidDidFormatError);
    });

    it('should reject wrong hex length', () => {
      expect(() =>
        normalizeDidIdentifier(`did:verity:${HEX.slice(0, 63)}`),
      ).toThrow(InvalidDidFormatError);
      expect(() =>
        normalizeDidIdentifier(`did:verity:${'a'.repeat(65)}`),
      ).toThrow(InvalidDidFormatError);
    });

    it('should reject non-hex characters', () => {
      expect(() =>
        normalizeDidIdentifier(`did:verity:${HEX.slice(0, 63)}g`),
      ).toThrow(InvalidDidFormatError);
    });

    it('should reject non-strings', () => {
      expect(() =>
        normalizeDidIdentifier(undefined as unknown as string),
      ).toThrow(InvalidDidFormatError);
    });
  });

  describe('toCanonicalDid', () => {
    it('should prefix the hex with the DID method', () => {
      expect(toCanonicalDid(HEX)).toBe(`did:verity:${HEX}`);
    });
  });

  describe('isValidStellarAddress', () => {
    it('should accept a valid ed25519 public key', () => {
      expect(
        isValidStellarAddress(
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        ),
      ).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidStellarAddress('not-an-address')).toBe(false);
      expect(isValidStellarAddress('')).toBe(false);
    });
  });

  it('should expose the canonical prefix constant', () => {
    expect(DID_PREFIX).toBe('did:verity:');
  });
});
