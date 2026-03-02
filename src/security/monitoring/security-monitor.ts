// TODO: Implement security monitoring
class SecurityMonitor {
  recordEvent(_event: string, _details?: Record<string, unknown>): void {}

  getAlerts(): Array<{ type: string; message: string; timestamp: number }> {
    return [];
  }

  isHealthy(): boolean {
    return true;
  }
}

export const securityMonitor = new SecurityMonitor();
