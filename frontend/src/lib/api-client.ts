import { APIResponse } from "@/types";

const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      if (
        (envUrl.includes("127.0.0.1") || envUrl.includes("localhost")) &&
        !window.location.hostname.includes("127.0.0.1") &&
        !window.location.hostname.includes("localhost")
      ) {
        return `${window.location.origin}/api/v1`;
      }
      if (envUrl.startsWith("/")) {
        return `${window.location.origin}${envUrl}`;
      }
      return envUrl;
    }
    return `${window.location.origin}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

let currentAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (refreshPromise) return refreshPromise;
  const refreshToken = sessionStorage.getItem("smartedu_refresh_token");
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const tokens = payload?.data;
      if (!tokens?.access_token || !tokens?.refresh_token) return null;
      setApiAccessToken(tokens.access_token);
      sessionStorage.setItem("smartedu_refresh_token", tokens.refresh_token);
      return tokens.access_token as string;
    } catch {
      return null;
    }
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function setApiAccessToken(token: string | null) {
  currentAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("smartedu_access_token", token);
    } else {
      sessionStorage.removeItem("smartedu_access_token");
    }
  }
}

export function getApiAccessToken(): string | null {
  if (currentAccessToken) return currentAccessToken;
  if (typeof window !== "undefined") {
    currentAccessToken = sessionStorage.getItem("smartedu_access_token");
  }
  return currentAccessToken;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Standardized HTTP request client with envelope unwrapping, Bearer token injection, and error translation.
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getApiAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });
    if (response.status === 401 && !["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register"].includes(endpoint)) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...options, headers });
      }
    }

    let data: any = null;
    const rawText = await response.text();
    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }
    } else {
      data = {};
    }

    if (!response.ok) {
      const errorCode = data?.error?.code || `HTTP_${response.status}`;
      const errorMessage = data?.error?.message || data?.detail || data?.message || "An unexpected error occurred.";
      throw new ApiError(errorCode, errorMessage, data?.error?.details);
    }

    if (data?.success === false) {
      throw new ApiError(data?.error?.code || "REQUEST_FAILED", data?.error?.message || data?.message || "The request failed.");
    }
    const isLiveSessionOrAdminState =
      endpoint.includes("/assessments/live-session") ||
      endpoint.includes("/admin/operational-state");
    if (
      typeof window !== "undefined" &&
      !["GET", "HEAD"].includes((options.method || "GET").toUpperCase()) &&
      !endpoint.startsWith("/auth/") &&
      !isLiveSessionOrAdminState
    ) {
      window.dispatchEvent(new Event("academic-data-changed"));
    }
    // Support both wrapped APIResponse and direct FastAPI model responses
    if (data && typeof data === "object" && "success" in data) {
      if (!("data" in data)) {
        return {
          ...data,
          data: data as T,
        } as APIResponse<T>;
      }
      return data as APIResponse<T>;
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("NETWORK_ERROR", (error as Error).message || "Failed to communicate with API.");
  }
}

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const res = await fetchApi<T>(endpoint, { method: "GET" });
    return res.data as T;
  },
  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetchApi<T>(endpoint, {
      method: "POST",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.data as T;
  },
  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetchApi<T>(endpoint, {
      method: "PUT",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.data as T;
  },
  patch: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetchApi<T>(endpoint, {
      method: "PATCH",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.data as T;
  },
  delete: async <T>(endpoint: string): Promise<T> => {
    const res = await fetchApi<T>(endpoint, { method: "DELETE" });
    return res.data as T;
  },
};
