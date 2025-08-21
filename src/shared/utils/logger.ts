interface LogData {
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'error' | 'warn' | 'debug'
  message: string
  data?: LogData
  error?: Error
}

const formatLog = (entry: LogEntry): string => {
  const { timestamp, level, message, data, error } = entry
  const logData = data ? ` ${JSON.stringify(data)}` : ''
  const errorData = error ? ` ${error.stack || error.message}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${logData}${errorData}`
}

export const logger = {
  info: (message: string, data?: LogData) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    }
    console.log(formatLog(entry))
  },

  error: (message: string, error?: Error | LogData) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error instanceof Error ? error : undefined,
      data: error instanceof Error ? undefined : error,
    }
    console.error(formatLog(entry))
  },

  warn: (message: string, data?: LogData) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    }
    console.warn(formatLog(entry))
  },

  debug: (message: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        data,
      }
      console.debug(formatLog(entry))
    }
  },
}
