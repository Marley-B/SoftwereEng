import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

/** Public API origin (same host as Fastify `apps/api`). */
export const API_BASE_URL = extra?.apiBaseUrl ?? "http://127.0.0.1:3000";

let bearerToken: string | null = null;

export const setBearerToken = (token: string | null): void => {
  bearerToken = token;
};

export const getBearerToken = (): string | null => bearerToken;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** JSON body; sets Content-Type. */
  json?: unknown;
  /** When true, do not attach Authorization. */
  skipAuth?: boolean;
}

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { json, skipAuth, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(rest.headers);
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth && bearerToken) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (e) {
    const hint =
      "On a physical device set EXPO_PUBLIC_API_BASE_URL to your computer’s LAN IP (not localhost). Android emulator: try http://10.0.2.2:PORT.";
    const detail = e instanceof Error ? e.message : String(e);
    throw new ApiError(0, {
      error: `Cannot reach API at ${API_BASE_URL}. ${detail} ${hint}`,
    });
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
};
