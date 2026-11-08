import winston from 'winston';
import { env } from './env.config';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Human-readable format for development
const devFormat = printf(({ level, message, timestamp: time, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  const stackString = stack ? `\n${stack}` : '';
  return `[${time}] ${level}: ${message}${metaString}${stackString}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  defaultMeta: { service: 'secureride-api', environment: env.NODE_ENV },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' 
        ? json() 
        : combine(colorize({ all: true }), devFormat),
    }),
  ],
  exitOnError: false,
});

