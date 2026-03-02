// TODO: Implement security logger
class SecurityLogger {
  log(_level: string, _message: string, _meta?: Record<string, unknown>): void {}

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  audit(_action: string, _details?: Record<string, unknown>): void {}
}

export const securityLogger = new SecurityLogger();
