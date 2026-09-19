/**
 * Returns true if the request carries a valid cron secret.
 * Accepts either Authorization: Bearer <secret> (Vercel cron format)
 * or x-cron-secret header (manual trigger format).
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authorization = request.headers.get('authorization')
  if (authorization === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}
