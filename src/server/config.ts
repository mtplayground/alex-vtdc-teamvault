import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === "true");

const optionalUrl = z.string().url().optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SELF_URL: z.string().url(),
  ALLOWED_CORS_ORIGIN: optionalUrl,
  SESSION_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),
  MCTAI_AUTH_URL: z.string().url(),
  MCTAI_AUTH_APP_TOKEN: z.string().min(1),
  MCTAI_AUTH_JWKS_URL: z.string().url(),
  MCTAI_EMAIL_URL: optionalUrl,
  MCTAI_EMAIL_APP_TOKEN: z.string().optional(),
  S3_ENDPOINT: optionalUrl,
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: booleanFromString,
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid server configuration: ${details}`);
}

export const config = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  selfUrl: parsedEnv.data.SELF_URL,
  corsOrigin: parsedEnv.data.ALLOWED_CORS_ORIGIN ?? parsedEnv.data.SELF_URL,
  sessionSecret: parsedEnv.data.SESSION_SECRET,
  database: {
    url: parsedEnv.data.DATABASE_URL,
    poolSize: parsedEnv.data.DATABASE_POOL_SIZE,
  },
  auth: {
    url: parsedEnv.data.MCTAI_AUTH_URL,
    appToken: parsedEnv.data.MCTAI_AUTH_APP_TOKEN,
    jwksUrl: parsedEnv.data.MCTAI_AUTH_JWKS_URL,
  },
  email: {
    url: parsedEnv.data.MCTAI_EMAIL_URL,
    appToken: parsedEnv.data.MCTAI_EMAIL_APP_TOKEN,
    enabled: Boolean(parsedEnv.data.MCTAI_EMAIL_URL && parsedEnv.data.MCTAI_EMAIL_APP_TOKEN),
  },
  storage: {
    enabled: Boolean(
      parsedEnv.data.S3_ENDPOINT &&
        parsedEnv.data.S3_REGION &&
        parsedEnv.data.S3_BUCKET &&
        parsedEnv.data.S3_ACCESS_KEY_ID &&
        parsedEnv.data.S3_SECRET_ACCESS_KEY,
    ),
    endpoint: parsedEnv.data.S3_ENDPOINT,
    region: parsedEnv.data.S3_REGION,
    bucket: parsedEnv.data.S3_BUCKET,
    accessKeyId: parsedEnv.data.S3_ACCESS_KEY_ID,
    secretAccessKey: parsedEnv.data.S3_SECRET_ACCESS_KEY,
    forcePathStyle: parsedEnv.data.S3_FORCE_PATH_STYLE,
  },
} as const;

export type ServerConfig = typeof config;
