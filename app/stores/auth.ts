import { defineStore } from 'pinia'
import type { UserResponse } from '~/types/user'
import { jwtDecode } from 'jwt-decode'

export const useAuthStore = defineStore('auth', () => {
    // Use useState for reactive token - survives navigation
    const token = useState<string | null>('auth_token', () => {
        const cookie = useCookie('auth_token')
        return cookie.value || null
    })
    const user = useState<UserResponse | null>('auth_user', () => null)
    const loggingIn = ref(false)

    const isAuthenticated = computed(() => !!token.value)
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const isNodeAdmin = computed(() => user.value?.role === 'node_admin' || isSuperAdmin.value)

    function setToken(value: string | null) {
        token.value = value
        if (value) {
            // Set cookie with 7-day expiry
            const cookie = useCookie('auth_token', {
                maxAge: 60 * 60 * 24 * 7,
                sameSite: 'lax',
                path: '/'
            })
            cookie.value = value
        } else {
            // Delete cookie by setting it to null with immediate removal
            const cookie = useCookie('auth_token', {
                path: '/'
            })
            cookie.value = null
            user.value = null
        }
    }

    async function login(username: string, password: string, turnstileToken?: string) {
        const config = useRuntimeConfig()
        loggingIn.value = true
        try {
            const body: Record<string, string> = { username, password }
            if (turnstileToken) {
                body.turnstile_token = turnstileToken
            }
            const response = await $fetch<{ access_token: string }>('/auth/login', {
                baseURL: config.public.apiBase,
                method: 'POST',
                body
            })
            setToken(response.access_token)
            await fetchUser()
            setTimeout(() => {
                loggingIn.value = false
            }, 2000)
        } catch (error: unknown) {
            loggingIn.value = false
            // Check for verification error (403) with new response format
            if (error && typeof error === 'object' && 'data' in error) {
                const fetchError = error as { data?: { detail?: { error?: string; user_id?: number; email?: string } }; response?: { status?: number } }
                if (fetchError.response?.status === 403 && fetchError.data?.detail?.error === 'email_not_verified') {
                    // Throw error with verification details
                    const verificationError = new Error('EMAIL_NOT_VERIFIED') as Error & { userId?: number; email?: string }
                    verificationError.userId = fetchError.data.detail.user_id
                    verificationError.email = fetchError.data.detail.email
                    throw verificationError
                }
            }
            throw error
        }
    }

    // Verify email using public endpoint (no auth required)
    async function verifyEmail(userId: number, code: string): Promise<{ success: boolean; message: string }> {
        const config = useRuntimeConfig()
        const response = await $fetch<{ success: boolean; message: string }>(`/auth/verify-email?user_id=${userId}`, {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: { code }
        })
        return response
    }

    async function requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
        const config = useRuntimeConfig()
        const response = await $fetch<{ success: boolean; message: string }>('/auth/magic-link', {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: { email }
        })
        return response
    }

    async function loginWithMagicLink(magicToken: string): Promise<void> {
        const config = useRuntimeConfig()
        loggingIn.value = true
        try {
            const response = await $fetch<{ access_token: string; token_type: string }>(`/auth/magic-link/${magicToken}`, {
                baseURL: config.public.apiBase,
                method: 'GET'
            })
            setToken(response.access_token)
            await fetchUser()
            setTimeout(() => {
                loggingIn.value = false
            }, 2000)
        } catch (error) {
            loggingIn.value = false
            throw error
        }
    }

    async function fetchUser() {
        if (!token.value) {
            user.value = null
            return
        }
        try {
            const config = useRuntimeConfig()
            user.value = await $fetch<UserResponse>('/users/me', {
                baseURL: config.public.apiBase,
                headers: { Authorization: `Bearer ${token.value}` }
            })
        } catch (error: any) {
            // Only clear user on 401 or if explicitly needed
            if (error?.response?.status === 401 || error?.statusCode === 401) {
                user.value = null
            }
            throw error
        }
    }

    function logout() {
        setToken(null)
        user.value = null
        navigateTo('/login')
    }

    async function updateProfile(data: { full_name?: string; email?: string; password?: string }) {
        if (!token.value) throw new Error('Not authenticated')
        const config = useRuntimeConfig()
        const updated = await $fetch<UserResponse>('/users/me', {
            baseURL: config.public.apiBase,
            method: 'PUT',
            headers: { Authorization: `Bearer ${token.value}` },
            body: data
        })
        user.value = updated
        return updated
    }

    async function refreshToken() {
        if (!token.value) return false
        const config = useRuntimeConfig()
        try {
            const response = await $fetch<{ access_token: string }>('/auth/refresh', {
                baseURL: config.public.apiBase,
                method: 'POST',
                headers: { Authorization: `Bearer ${token.value}` }
            })
            setToken(response.access_token)
            return true
        } catch (error) {
            // If refresh fails, limit retries or loop, but usually just logout if 401
            console.error('Token refresh failed', error)
            return false
        }
    }

    function isTokenExpiring(thresholdSeconds = 300): boolean {
        if (!token.value) return false
        try {
            const decoded: any = jwtDecode(token.value)
            if (!decoded.exp) return false
            const now = Date.now() / 1000
            return decoded.exp - now < thresholdSeconds
        } catch (e) {
            return true // Treat invalid token as expiring/expired
        }
    }

    async function checkAndRefreshToken() {
        if (isTokenExpiring()) {
            return await refreshToken()
        }
        return true
    }

    return {
        token,
        user,
        isAuthenticated,
        isSuperAdmin,
        isNodeAdmin,
        loggingIn,
        login,
        verifyEmail,
        requestMagicLink,
        loginWithMagicLink,
        fetchUser,
        logout,
        updateProfile,
        refreshToken,
        checkAndRefreshToken
    }
})
