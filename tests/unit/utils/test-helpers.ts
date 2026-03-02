/**
 * Test Helpers - Utility functions for unit and integration tests
 */

export function mockApiResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function mockApiError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createMockFetch(responses: Map<string, any>): typeof fetch {
  return async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const data = responses.get(url);
    if (data) {
      return mockApiResponse(data);
    }
    return mockApiError('Not found', 404);
  };
}

export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
