// Tiny structured logger. Swap for pino/winston later without changing call sites.

type Level = 'debug' | 'info' | 'warn' | 'error'

const levelWeight: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? 'info'

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (levelWeight[level] < levelWeight[minLevel]) return
  const entry = {
    t: new Date().toISOString(),
    level,
    msg,
    ...meta,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
}
