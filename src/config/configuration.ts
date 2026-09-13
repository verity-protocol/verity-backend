import { registerAs } from '@nestjs/config';

export const configuration = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '', 10) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionExpiryMinutes:
    parseInt(process.env.SESSION_EXPIRY_MINUTES || '', 10) || 5,
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    horizonUrl:
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    rpcUrl:
      process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
    passphrase:
      process.env.STELLAR_PASSPHRASE ||
      'Test SDF Future Network ; October 2022',
    didRegistryContractId: process.env.STELLAR_CONTRACT_DID_REGISTRY,
    credentialRegistryContractId:
      process.env.STELLAR_CONTRACT_CREDENTIAL_REGISTRY,
    feeSponsorSecret: process.env.STELLAR_FEE_SPONSOR_SECRET,
    adminSecret: process.env.STELLAR_ADMIN_SECRET,
    issuerSecret: process.env.STELLAR_ISSUER_SECRET,
  },
  kyc: {
    apiUrl: process.env.KYC_PROVIDER_API_URL,
    apiKey: process.env.KYC_PROVIDER_API_KEY,
  },
}));
