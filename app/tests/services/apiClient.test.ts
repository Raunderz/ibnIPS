// Test API client logic — validates request/response handling patterns.
// In a real app this would wrap fetch; here we test the pure middleware logic.

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

interface ApiError {
  message: string;
  status: number;
}

function createApiClient(config: ApiConfig) {
  let requestCount = 0;

  function buildUrl(path: string): string {
    const base = config.baseUrl.replace(/\/+$/, '');
    const segment = path.startsWith('/') ? path : `/${path}`;
    return `${base}${segment}`;
  }

  function buildHeaders(custom?: Record<string, string>): Record<string, string> {
    return { ...config.headers, ...custom };
  }

  function createTimeoutController(): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), config.timeout);
    return controller;
  }

  return {
    buildUrl,
    buildHeaders,
    createTimeoutController,
    getConfig: () => ({ ...config }),
    getRequestCount: () => requestCount,
    incrementRequestCount: () => { requestCount++; },
    resetRequestCount: () => { requestCount = 0; },
  };
}

describe('API Client Logic', () => {
  let client: ReturnType<typeof createApiClient>;

  beforeEach(() => {
    client = createApiClient({
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  describe('buildUrl', () => {
    it('should construct full URL from path', () => {
      expect(client.buildUrl('/api/positions')).toBe('http://localhost:3000/api/positions');
    });

    it('should handle path without leading slash', () => {
      expect(client.buildUrl('api/rooms')).toBe('http://localhost:3000/api/rooms');
    });

    it('should handle trailing slash in baseUrl', () => {
      const c = createApiClient({
        baseUrl: 'http://localhost:3000/',
        timeout: 5000,
        headers: {},
      });
      expect(c.buildUrl('/test')).toBe('http://localhost:3000/test');
    });
  });

  describe('buildHeaders', () => {
    it('should include default headers', () => {
      const headers = client.buildHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge custom headers', () => {
      const headers = client.buildHeaders({ Authorization: 'Bearer token123' });
      expect(headers['Authorization']).toBe('Bearer token123');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('custom headers should override defaults', () => {
      const headers = client.buildHeaders({ 'Content-Type': 'text/plain' });
      expect(headers['Content-Type']).toBe('text/plain');
    });
  });

  describe('request count tracking', () => {
    it('should start at 0', () => {
      expect(client.getRequestCount()).toBe(0);
    });

    it('should increment request count', () => {
      client.incrementRequestCount();
      client.incrementRequestCount();
      expect(client.getRequestCount()).toBe(2);
    });

    it('should reset request count', () => {
      client.incrementRequestCount();
      client.resetRequestCount();
      expect(client.getRequestCount()).toBe(0);
    });
  });

  describe('config', () => {
    it('should expose config safely (copy)', () => {
      const config = client.getConfig();
      config.timeout = 999;
      expect(client.getConfig().timeout).toBe(5000);
    });
  });
});
