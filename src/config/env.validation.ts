import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  STELLAR_NETWORK: Joi.string()
    .valid('standalone', 'testnet', 'mainnet')
    .default('testnet'),
  STELLAR_HORIZON_URL: Joi.string().uri().required(),
  STELLAR_RPC_URL: Joi.string().uri().required(),
  STELLAR_PASSPHRASE: Joi.string().required(),
  KYC_PROVIDER_API_URL: Joi.string().uri().required(),
  KYC_PROVIDER_API_KEY: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  SESSION_EXPIRY_MINUTES: Joi.number().default(5),
});
