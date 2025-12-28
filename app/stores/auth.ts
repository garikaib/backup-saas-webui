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
    // Temporary storage for MFA/Verification flows
    const mfaToken = useState<string | null>('auth_mfa_token', () => null)

    const isAuthenticated = computed(() => !!token.value)
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const isNodeAdmin = computed(() => user.value?.role === 'node_admin')
    const isSiteAdmin = computed(() => user.value?.role === 'site_admin')
    const isNodeAdminOrHigher = computed(() =>
        user.value?.role === 'super_admin' || user.value?.role === 'node_admin'
    )

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
            mfaToken.value = null
        }
    }

    async function login(username: string, password: string, turnstileToken?: string) {
        const config = useRuntimeConfig()
        loggingIn.value = true
        mfaToken.value = null // Clear previous MFA token

        try {
            const body: Record<string, string> = { username, password }
            if (turnstileToken) {
                body.turnstile_token = turnstileToken
            }
            const response = await $fetch<any>('/auth/login', {
                baseURL: config.public.apiBase,
                method: 'POST',
                body
            })

            // Check if MFA is required
            if (response.mfa_required) {
                if (response.mfa_token) {
                    mfaToken.value = response.mfa_token
                    throw { message: 'MFA_REQUIRED', mfaToken: response.mfa_token }
                } else {
                    throw new Error('MFA required but no token provided')
                }
            }

            // Normal login success
            setToken(response.access_token)
            await fetchUser()
            setTimeout(() => {
                loggingIn.value = false
            }, 2000)
        } catch (error: any) {
            loggingIn.value = false

            // Handle 429 Too Many Requests
            if (error?.response?.status === 429) {
                const retryAfter = error.response.headers.get('Retry-After')
                throw {
                    message: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: retryAfter ? parseInt(retryAfter) : undefined
                }
            }

            // Check for verification error (403) with new response format
            if (error?.response?.status === 403) {
                const data = error.response._data
                if (data?.detail?.error === 'email_not_verified') {
                    // Throw error with verification details
                    throw {
                        message: 'EMAIL_NOT_VERIFIED',
                        userId: data.detail.user_id,
                        email: data.detail.email,
                        verificationToken: data.detail.verification_token
                    }
                }
            }

            // Re-throw special errors (MFA, Rate Limit) or standard errors
            throw error
        }
    }

    async function verifyMfa(code: string) {
        if (!mfaToken.value) throw new Error('No MFA token available')

        const config = useRuntimeConfig()
        loggingIn.value = true

        try {
            const response = await $fetch<{ access_token: string }>('/auth/mfa/verify', {
                baseURL: config.public.apiBase,
                method: 'POST',
                body: {
                    code,
                    mfa_token: mfaToken.value
                }
            })

            setToken(response.access_token)
            await fetchUser()
            mfaToken.value = null // Clear used token
            loggingIn.value = false
            return true
        } catch (error) {
            loggingIn.value = false
            throw error
        }
    }

    async function enableMfa(channelId: number) {
        if (!token.value) throw new Error('Not authenticated')
        const config = useRuntimeConfig()

        return await $fetch('/auth/mfa/enable', {
            baseURL: config.public.apiBase,
            method: 'POST',
            headers: { Authorization: `Bearer ${token.value}` },
            body: { channel_id: channelId }
        })
    }

    // Verify email using public endpoint (no auth required)
    // Updated to accept verification_token if available
    async function verifyEmail(userId: number, code: string, verificationToken?: string): Promise<{ success: boolean; message: string }> {
        const config = useRuntimeConfig()

        const body: any = { code }
        // If we have the new token format, send it (preferred)
        if (verificationToken) {
            body.token = verificationToken
        }

        // Note: URL param user_id might still be needed for backward compat or if token is missing
        // implementing based on "Old Payload ... (with user_id in URL) New Payload ... The JSON body is preferred."
        // We will keep user_id in URL as fallback or if API expects it

        const response = await $fetch<{ success: boolean; message: string }>(`/auth/verify-email?user_id=${userId}`, {
            baseURL: config.public.apiBase,
            method: 'POST',
            body
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
        // const config = useRuntimeConfig()
        try {
            // Endpoint /auth/refresh does not exist in API docs.
            // Disabling auto-refresh until backend implementation is confirmed.
            /*
            const response = await $fetch<{ access_token: string }>('/auth/refresh', {
                baseURL: config.public.apiBase,
                method: 'POST',
                headers: { Authorization: `Bearer ${token.value}` }
            })
            setToken(response.access_token)
            return true
            */
            return false
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

    async function register(data: { full_name: string; email: string; password: string }) {
        const config = useRuntimeConfig()
        loggingIn.value = true
        try {
            await $fetch('/auth/register', {
                baseURL: config.public.apiBase,
                method: 'POST',
                body: data
            })
            // Usually register doesn't auto-login if verification required.
            // But if it does, handle it. Assuming it just creates account.
        } catch (error) {
            throw error
        } finally {
            loggingIn.value = false
        }
    }

    return {
        token,
        user,
        isAuthenticated,
        isSuperAdmin,
        isNodeAdmin,
        isSiteAdmin,
        isNodeAdminOrHigher,
        loggingIn,
        login,
        register,
        verifyEmail,
        requestMagicLink,
        loginWithMagicLink,
        fetchUser,
        logout,
        updateProfile,
        refreshToken,
        checkAndRefreshToken,
        verifyMfa,
        enableMfa
    }
})
