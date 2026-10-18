/**
 * HEPHAESTUS API client — typed wrappers around the FastAPI backend.
 * Always targets port 8000 on whatever host the frontend is on.
 */

const BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  scenario_id: string;
  name: string;
  description?: string;
  category: string;
  severity: string;
  tags: string[];
  payload?: string;
  technique?: string;
  expected_behavior?: string;
  is_builtin: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface Suite {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  is_builtin: boolean;
  scenario_count: number;
  created_at?: string;
}

export interface SuiteDetail extends Suite {
  scenarios: Scenario[];
}

export interface Target {
  id: string;
  name: string;
  description?: string;
  target_type: string;
  config: Record<string, unknown>;
  is_hardened: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface TestRun {
  id: string;
  suite_id?: string;
  target_id?: string;
  run_name?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  total_scenarios: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  created_at?: string;
  suite_name?: string;
  target_name?: string;
}

export interface TestResult {
  id: string;
  run_id: string;
  scenario_id?: string;
  scenario_name?: string;
  category?: string;
  severity?: string;
  status: "passed" | "failed" | "error" | "skipped";
  payload?: string;
  response_text?: string;
  expected_behavior?: string;
  observed_behavior?: string;
  evidence?: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number;
  executed_at?: string;
  target_config_snapshot?: Record<string, unknown>;
}

export interface RunDetail extends TestRun {
  results: TestResult[];
}

export interface DashboardStats {
  total_scenarios: number;
  total_suites: number;
  total_runs: number;
  recent_runs: TestRun[];
  pass_rate: number;
  category_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  last_run_at?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  health: () => request<{ status: string; version: string }>("/health"),

  dashboard: () => request<DashboardStats>("/dashboard"),

  scenarios: {
    list: (params?: { category?: string; severity?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Scenario[]>(`/scenarios${qs ? "?" + qs : ""}`);
    },
    get: (id: string) => request<Scenario>(`/scenarios/${id}`),
    create: (data: Partial<Scenario>) =>
      request<Scenario>("/scenarios", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/scenarios/${id}`, { method: "DELETE" }),
  },

  suites: {
    list: () => request<Suite[]>("/suites"),
    get: (id: string) => request<SuiteDetail>(`/suites/${id}`),
    create: (data: { name: string; description?: string; tags?: string[]; scenario_ids?: string[] }) =>
      request<Suite>("/suites", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; description: string; tags: string[]; scenario_ids: string[] }>) =>
      request<Suite>(`/suites/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/suites/${id}`, { method: "DELETE" }),
  },

  targets: {
    list: () => request<Target[]>("/targets"),
    get: (id: string) => request<Target>(`/targets/${id}`),
    create: (data: Partial<Target>) =>
      request<Target>("/targets", { method: "POST", body: JSON.stringify(data) }),
  },

  runs: {
    list: (limit = 50) => request<TestRun[]>(`/runs?limit=${limit}`),
    get: (id: string) => request<RunDetail>(`/runs/${id}`),
    create: (data: {
      suite_id?: string;
      target_id?: string;
      run_name?: string;
      scenario_ids?: string[];
    }) => request<TestRun>("/runs", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/runs/${id}`, { method: "DELETE" }),
    results: (id: string) => request<TestResult[]>(`/runs/${id}/results`),
  },

  reports: {
    jsonUrl: (runId: string) => `${BASE}/reports/${runId}/json`,
    htmlUrl: (runId: string) => `${BASE}/reports/${runId}/html`,
  },
};
