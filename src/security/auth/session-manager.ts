// TODO: Implement session management
class SessionManager {
  createSession(_userId: string): string {
    return '';
  }

  validateSession(_sessionId: string): boolean {
    return false;
  }

  destroySession(_sessionId: string): void {}
}

export const sessionManager = new SessionManager();
