type LogArgs = unknown[];

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  debug: (...args: LogArgs) => {
    if (!isProduction) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (!isProduction) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};
