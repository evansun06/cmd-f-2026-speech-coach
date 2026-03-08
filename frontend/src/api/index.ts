export const USE_MOCK = true
export const API_BASE_URL = 'http://localhost:8000'

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface LoginResponse {
  message: string
  user: AuthUser
}

export interface SignupResponse {
  message: string
  user: AuthUser
}

export interface CurrentUserResponse {
  user: AuthUser
}

export type SessionStatus =
  | 'draft'
  | 'media_attached'
  | 'queued_ml'
  | 'processing_ml'
  | 'ml_ready'
  | 'processing_coach'
  | 'ready'
  | 'coach_failed'
  | 'failed'

export interface CoachingSessionListItem {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: SessionStatus
}

export interface CoachingSessionDetail extends CoachingSessionListItem {}

export interface SessionCreateResponse {
  id: string
}

export interface SessionAssetsPayload {
  slidesFile?: File | null
  scriptText?: string
  contextText?: string
}

export interface ApiError {
  message: string
  status?: number
}

interface MockAuthData {
  login_success: LoginResponse
  signup_success: SignupResponse
  current_user: CurrentUserResponse
  errors: {
    invalid_credentials: string
    email_already_exists: string
  }
}

interface MockSessionsData {
  sessions: CoachingSessionListItem[]
  session_details?: Record<string, CoachingSessionDetail>
}

const MOCK_DELAY_MS = 1000

function getCookieValue(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const targetCookie = cookies.find((cookie) => cookie.startsWith(`${name}=`))

  return targetCookie ? decodeURIComponent(targetCookie.split('=').slice(1).join('=')) : null
}

function getCsrfTokenFromCookie(): string {
  const token = getCookieValue('csrftoken')

  if (!token) {
    throw {
      message: 'Missing CSRF token cookie. Refresh and try again.',
    } satisfies ApiError
  }

  return token
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    const errorMessage =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`

    throw {
      message: errorMessage,
      status: response.status,
    } satisfies ApiError
  }

  if (!data) {
    throw {
      message: 'Empty response from server.',
      status: response.status,
    } satisfies ApiError
  }

  return data
}

async function ensureSuccessResponse(response: Response): Promise<void> {
  if (response.ok) {
    return
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null
  const errorMessage =
    data && typeof data.message === 'string' ? data.message : `Request failed with status ${response.status}`

  throw {
    message: errorMessage,
    status: response.status,
  } satisfies ApiError
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function getMockAuthData(): Promise<MockAuthData> {
  const mockUrl = new URL('./mock/auth.json', import.meta.url).href
  const response = await fetch(mockUrl)

  return parseJsonResponse<MockAuthData>(response)
}

async function getMockSessionsData(): Promise<MockSessionsData> {
  const mockUrl = new URL('./mock/sessions.json', import.meta.url).href
  const response = await fetch(mockUrl)

  return parseJsonResponse<MockSessionsData>(response)
}

function getMockSessionDetail(mockData: MockSessionsData, sessionId: string): CoachingSessionDetail {
  const detailedSession = mockData.session_details?.[sessionId]
  if (detailedSession) {
    return detailedSession
  }

  const listSession = mockData.sessions.find((session) => session.id === sessionId)
  if (listSession) {
    return listSession
  }

  throw {
    message: 'Session not found.',
    status: 404,
  } satisfies ApiError
}

export const api = {
  auth: {
    async login(email: string, password: string): Promise<LoginResponse> {
      if (USE_MOCK) {
        const mockData = await getMockAuthData()
        if (!email || !password || email === 'fail@example.com') {
          throw { message: mockData.errors.invalid_credentials } satisfies ApiError
        }
        return mockData.login_success
      }

      const csrfToken = getCsrfTokenFromCookie()

      // TODO: real endpoint - POST /api/v1/clients/login
      const response = await fetch(`${API_BASE_URL}/api/v1/clients/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      })

      return parseJsonResponse<LoginResponse>(response)
    },

    async signup(name: string, email: string, password: string): Promise<SignupResponse> {
      if (USE_MOCK) {
        const mockData = await getMockAuthData()
        if (!name || !email || !password || email === 'taken@example.com') {
          throw { message: mockData.errors.email_already_exists } satisfies ApiError
        }
        return mockData.signup_success
      }

      const csrfToken = getCsrfTokenFromCookie()

      // TODO: real endpoint - POST /api/v1/clients/signup
      const response = await fetch(`${API_BASE_URL}/api/v1/clients/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ name, email, password }),
      })

      return parseJsonResponse<SignupResponse>(response)
    },

    async getCurrentUser(): Promise<CurrentUserResponse> {
      if (USE_MOCK) {
        const mockData = await getMockAuthData()
        return mockData.current_user
      }

      // TODO: real endpoint - GET /api/v1/clients/me
      const response = await fetch(`${API_BASE_URL}/api/v1/clients/me`, {
        method: 'GET',
        credentials: 'include',
      })

      return parseJsonResponse<CurrentUserResponse>(response)
    },
  },
  sessions: {
    async list(): Promise<CoachingSessionListItem[]> {
      if (USE_MOCK) {
        const mockData = await getMockSessionsData()
        return mockData.sessions
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'GET',
        credentials: 'include',
      })

      return parseJsonResponse<CoachingSessionListItem[]>(response)
    },

    async create(): Promise<SessionCreateResponse> {
      if (USE_MOCK) {
        await delay(MOCK_DELAY_MS)
        return { id: 'mock-123' }
      }

      const csrfToken = getCsrfTokenFromCookie()
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      })

      return parseJsonResponse<SessionCreateResponse>(response)
    },

    async uploadVideo(sessionId: string, videoFile: File | null): Promise<void> {
      if (USE_MOCK) {
        await delay(MOCK_DELAY_MS)
        return
      }

      if (!videoFile) {
        throw {
          message: 'Video file is required.',
        } satisfies ApiError
      }

      const csrfToken = getCsrfTokenFromCookie()
      const formData = new FormData()
      formData.append('video', videoFile)

      const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/video`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      })

      await ensureSuccessResponse(response)
    },

    async uploadAssets(sessionId: string, payload: SessionAssetsPayload): Promise<void> {
      const scriptText = payload.scriptText?.trim()
      const contextText = payload.contextText?.trim()
      const hasAssets = Boolean(payload.slidesFile || scriptText || contextText)

      if (!hasAssets) {
        return
      }

      if (USE_MOCK) {
        await delay(MOCK_DELAY_MS)
        return
      }

      const csrfToken = getCsrfTokenFromCookie()
      const formData = new FormData()

      if (payload.slidesFile) {
        formData.append('slides', payload.slidesFile)
      }

      if (scriptText) {
        formData.append('script_text', scriptText)
      }

      if (contextText) {
        formData.append('context', contextText)
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/assets`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      })

      await ensureSuccessResponse(response)
    },

    async startAnalysis(sessionId: string): Promise<void> {
      if (USE_MOCK) {
        await delay(MOCK_DELAY_MS)
        return
      }

      const csrfToken = getCsrfTokenFromCookie()
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/start-analysis`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      })

      await ensureSuccessResponse(response)
    },

    async getById(sessionId: string): Promise<CoachingSessionDetail> {
      if (USE_MOCK) {
        await delay(MOCK_DELAY_MS)
        const mockData = await getMockSessionsData()
        return getMockSessionDetail(mockData, sessionId)
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      return parseJsonResponse<CoachingSessionDetail>(response)
    },
  },
}

export default api
