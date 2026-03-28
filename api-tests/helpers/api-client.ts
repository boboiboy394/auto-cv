/**
 * API client helper — wraps native fetch with consistent response parsing.
 * From: api-testing skill template
 */

type ApiResp<T> = {
  status: number;
  body: T;
  headers: Headers;
};

type Opts = {
  token?: string;
  headers?: Record<string, string>;
};

export function createApiClient(baseUrl: string) {
  async function req<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: Opts = {}
  ): Promise<ApiResp<T>> {
    const hdrs: Record<string, string> = {
      "Content-Type": "application/json",
      ...opts.headers,
    };

    if (opts.token) {
      hdrs["Authorization"] = `Bearer ${opts.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: hdrs,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const ct = res.headers.get("content-type") ?? "";
    const parsed: T = ct.includes("application/json")
      ? (await res.json() as T)
      : ((await res.text()) as unknown as T);

    return { status: res.status, body: parsed, headers: res.headers };
  }

  return {
    get: <T>(path: string, opts?: Opts) => req<T>("GET", path, undefined, opts),
    post: <T>(path: string, body?: unknown, opts?: Opts) => req<T>("POST", path, body, opts),
    put: <T>(path: string, body?: unknown, opts?: Opts) => req<T>("PUT", path, body, opts),
    patch: <T>(path: string, body?: unknown, opts?: Opts) => req<T>("PATCH", path, body, opts),
    delete: <T>(path: string, opts?: Opts) => req<T>("DELETE", path, undefined, opts),
  };
}

export const api = createApiClient(
  process.env.API_BASE_URL ?? "http://localhost:3000/api"
);
