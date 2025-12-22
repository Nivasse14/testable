/**
 * Logger avec couleurs et timestamps
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor(context = 'SYSTEM') {
    this.context = context;
    this.startTime = Date.now();
  }

  _timestamp() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    return `[${elapsed}s]`;
  }

  _format(level, color, message, data = null) {
    const timestamp = this._timestamp();
    const prefix = `${colors.dim}${timestamp}${colors.reset} ${color}${level}${colors.reset} ${colors.bright}[${this.context}]${colors.reset}`;
    console.log(`${prefix} ${message}`);
    if (data) {
      console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
    }
  }

  info(message, data = null) {
    this._format('INFO', colors.cyan, message, data);
  }

  success(message, data = null) {
    this._format('SUCCESS', colors.green, message, data);
  }

  warn(message, data = null) {
    this._format('WARN', colors.yellow, message, data);
  }

  error(message, data = null) {
    this._format('ERROR', colors.red, message, data);
  }

  debug(message, data = null) {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      this._format('DEBUG', colors.magenta, message, data);
    }
  }

  progress(current, total, message = '') {
    const percent = ((current / total) * 100).toFixed(1);
    const barLength = 50;
    const filled = Math.floor((current / total) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    process.stdout.write(`\r${colors.cyan}[${bar}]${colors.reset} ${percent}% ${message}`);
    if (current === total) {
      console.log('');
    }
  }
}

export default Logger;
