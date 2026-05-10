import axios, { AxiosInstance } from 'axios'

/**
 * Migrated to cookie-based auth.
 * - baseURL is '/' so requests hit Next.js Route Handlers directly
 * - withCredentials: true sends httpOnly cookies automatically
 * - No Authorization header injection — tokens are managed via httpOnly cookies
 * - Refresh interceptor calls POST /api/auth/refresh (no body needed, cookie is read server-side)
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10_000,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (err: unknown) => void }> = []

/**
processQueue Function
  function processQueue(error: unknown)
  Processes all waiting requests after refresh finishes.
  If Refresh Success
  p.resolve(null)
  All queued requests continue.
  If Refresh Fails
  p.reject(error)
  All queued requests fail.
  Then Queue Cleared
  failedQueue = []
*/
function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)))
  failedQueue = []
}


/**
 * 
Request Interceptor
  apiClient.interceptors.request.use(
  Runs BEFORE every request.
  Current Logic
  (config) => config
  Does nothing.
  Passes request through.
 */
// No Authorization header injection — cookies handle auth
apiClient.interceptors.request.use((config) => config)

// On 401 — attempt silent token refresh via cookie, then replay queued requests
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    // Start Refresh Process
    originalRequest._retry = true //Marks request as retried.
    isRefreshing = true // Prevents multiple refresh calls.

    try {
      await axios.post('/api/auth/refresh', null, { withCredentials: true }) // Calls refresh API.
      /*
      Calls refresh API.
        No token manually sent.
        Browser automatically sends:
        refreshToken cookie
        because:
        withCredentials: true
      Backend Reads Cookie
        Server:
        verifies refresh token
        issues new access token cookie
      */
      processQueue(null) // All waiting requests resume.
      return apiClient(originalRequest) // Retry Original Request
    } catch (err) {
      processQueue(err) // Reject All Queued Requests
      if (typeof window !== 'undefined') {
        import('@/modules/auth/store/auth.store')
          .then(({ useAuthStore }) => useAuthStore.getState().clearAuth()) // Clear Frontend Auth State
          .catch(() => {})
        window.location.href = '/login' // User forced to login again.
      }
      return Promise.reject(err)
    } finally {
      isRefreshing = false // Refresh process complete.
      // Allows future refresh attempts.
    }
  }
)
