import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function ensureSslMode(url: string): string {
  if (url.includes("sslmode=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sslmode=require`;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

const resolvedDatabaseUrl = ensureSslMode(requireEnv("DATABASE_URL"));
if (process.env.DATABASE_URL !== resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

export const env = {
  DATABASE_URL: resolvedDatabaseUrl,
  JWT_SECRET: optionalEnv("JWT_SECRET", "sih26089-dev-secret-key-change-in-production"),
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "7d"),
  API_PORT: parseInt(optionalEnv("PORT", optionalEnv("API_PORT", "4000")), 10),
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "*"),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  REDIS_URL: optionalEnv("REDIS_URL", "redis://localhost:6379"),
  DIGILOCKER_MOCK: optionalEnv("DIGILOCKER_MOCK", "true"),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),
  MAX_COMMISSION_RATE: parseFloat(optionalEnv("MAX_COMMISSION_RATE", "5")),
  OTP_EXPIRY_MINUTES: parseInt(optionalEnv("OTP_EXPIRY_MINUTES", "5"), 10),
  SOCIAL_SECURITY_RATE: parseFloat(optionalEnv("SOCIAL_SECURITY_RATE", "0.01")),
} as const;

export type Env = typeof env;
