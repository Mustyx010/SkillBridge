/**
 * SkillBridge API Client Configuration
 */
const BASE_URL = "https://skillbridge-api.tb-skillbridge-backend.workers.dev";

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export const authAPI = {
  login: (credentials) => apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  getProfile: () => apiRequest("/api/v1/users/me", { method: "GET" }),
};

export default BASE_URL;