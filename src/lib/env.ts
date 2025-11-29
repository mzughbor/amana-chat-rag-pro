const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "ENCRYPTION_KEY",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NODE_ENV",
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_VARS)[number];

type EnvShape = Record<RequiredEnvKey, string>;

function validateEnv(): EnvShape {
  if (typeof window !== "undefined") {
    return {} as EnvShape;
  }

  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    console.error(message);
    throw new Error(message);
  }

  return REQUIRED_ENV_VARS.reduce((acc, key) => {
    acc[key] = process.env[key]!;
    return acc;
  }, {} as EnvShape);
}

export const env = validateEnv();
