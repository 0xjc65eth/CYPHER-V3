// TODO: Implement SSRF protection
class SSRFProtection {
  isAllowedUrl(_url: string): boolean {
    return false;
  }

  validateRequest(_url: string): { allowed: boolean; reason?: string } {
    return { allowed: false, reason: 'Not implemented' };
  }
}

export const ssrfProtection = new SSRFProtection();
