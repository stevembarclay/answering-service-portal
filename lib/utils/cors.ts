const getAllowedOrigins = (): string[] => {
  const env = process.env.ALLOWED_ORIGINS
  if (env) return env.split(',').map(o => o.trim())
  return ['http://localhost:3000']
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export function getCorsPreflightHeaders(origin: string | null): Record<string, string> {
  return {
    ...getCorsHeaders(origin),
    'Access-Control-Max-Age': '86400',
  }
}
