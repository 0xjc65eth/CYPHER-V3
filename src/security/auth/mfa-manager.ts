// TODO: Implement MFA (Multi-Factor Authentication)
class MFAManager {
  generateSecret(_userId: string): string {
    return '';
  }

  verifyToken(_userId: string, _token: string): boolean {
    return false;
  }

  isEnabled(_userId: string): boolean {
    return false;
  }
}

export const mfaManager = new MFAManager();
