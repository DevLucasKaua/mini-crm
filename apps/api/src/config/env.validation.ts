const REQUIRED_VARS = ['DATABASE_URL'] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_VARS.filter(
    (key) => config[key] === undefined || config[key] === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (config.PORT !== undefined && Number.isNaN(Number(config.PORT))) {
    throw new Error(`PORT must be a number, got "${config.PORT}"`);
  }

  return config;
}
