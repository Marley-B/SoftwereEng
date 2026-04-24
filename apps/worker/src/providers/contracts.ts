export interface ProviderResult {
  status: "ok" | "warn" | "fail";
  summary: string;
  raw: unknown;
}

export interface CommuteSignalProvider {
  name: string;
  checkRoute(): Promise<ProviderResult>;
}
