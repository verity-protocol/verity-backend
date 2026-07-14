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
  },
  kyc: {
    apiUrl: process.env.KYC_PROVIDER_API_URL,
    apiKey: process.env.KYC_PROVIDER_API_KEY,
  },
}));
