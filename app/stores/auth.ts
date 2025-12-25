import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: useCookie('auth_token').value || null,
        user: null as any
    }),
    getters: {
        isAuthenticated: (state) => !!state.token
    },
    actions: {
        async login(username: string, password: string) {
            const client = useApiClient()
            try {
                const response = await client<{ access_token: string }>('/auth/login', {
                    method: 'POST',
                    body: { username, password }
                })
                this.token = response.access_token
                const cookie = useCookie('auth_token')
                cookie.value = response.access_token
                await this.fetchUser()
            } catch (error) {
                throw error
            }
        },
        async fetchUser() {
            // Mock user fetch or implementation if API supports it
            this.user = { username: 'admin' }
        },
        logout() {
            this.token = null
            this.user = null
            const cookie = useCookie('auth_token')
            cookie.value = null
            navigateTo('/login')
        }
    }
})
