// TODO: Implement input sanitization
class InputSanitizer {
  sanitize(input: string): string {
    return input;
  }

  validate(_input: string, _rules: Record<string, unknown>): boolean {
    return true;
  }
}

export const inputSanitizer = new InputSanitizer();
