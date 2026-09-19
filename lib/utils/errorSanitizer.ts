export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Return the message but strip any potential stack traces or sensitive info
    return error.message.split('\n')[0]
  }
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}
