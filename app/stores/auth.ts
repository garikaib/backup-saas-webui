import { defineStore } from 'pinia'
import type { UserResponse } from '~/types/user'

export const useAuthStore = defineStore('auth', () => {
    // Use useState for reactive token - survives navigation
    const token = useState<string | null>('auth_token', () => {
        const cookie = useCookie('auth_token')
        return cookie.value || null
    })
    const user = ref<UserResponse | null>(null)
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
        }
    }

    async function login(username: string, password: string) {
        const config = useRuntimeConfig()
        loggingIn.value = true
        try {
            const response = await $fetch<{ access_token: string }>('/auth/login', {
                baseURL: config.public.apiBase,
                method: 'POST',
                body: { username, password }
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
        } catch (error) {
            // Token might be expired
            user.value = null
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

    return {
        token,
        user,
        isAuthenticated,
        isSuperAdmin,
        isNodeAdmin,
        loggingIn,
        login,
        fetchUser,
        logout,
        updateProfile
    }
})


