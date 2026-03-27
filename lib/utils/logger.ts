type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface ModuleLogger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

export function createModuleLogger(module: string): ModuleLogger {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'production' && level === 'debug') return
    console[level](`[${module}]`, ...args)
  }

  return {
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
    debug: (...args) => log('debug', ...args),
  }
}

/**
 * Default logger instance for use in components and shared utilities.
 * For API routes or modules that benefit from a named prefix, use createModuleLogger instead.
 */
export const logger = createModuleLogger('app')
