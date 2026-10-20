export interface ApiEnv {
  PORT: number;
  HOST: string;
  CORS_ORIGINS: string[];
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function loadEnv(): ApiEnv {
  required('DATABASE_URL');
  return {
    PORT: Number(required('PORT')),
    HOST: required('HOST'),
    CORS_ORIGINS: required('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
