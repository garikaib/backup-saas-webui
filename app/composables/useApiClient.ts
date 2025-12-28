export const useApiClient = () => {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    const toast = useToast()

    return $fetch.create({
        baseURL: config.public.apiBase,
        async onRequest({ options }) {
            const currentToken = authStore.token
            if (currentToken) {
                // Ensure token is fresh
                await authStore.checkAndRefreshToken()

                // Get potentially new token
                const validToken = authStore.token
                if (validToken) {
                    const headers = new Headers(options.headers as HeadersInit)
                    headers.set('Authorization', `Bearer ${validToken}`)
                    options.headers = headers
                }
            }
        },
        onResponseError({ response }) {
            // Handle 401 Unauthorized
            if (response.status === 401 && authStore.isAuthenticated && !authStore.loggingIn) {
                authStore.logout()
                return
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                const msg = response._data?.detail || 'You do not have permission to perform this action.'
                toast.add({
                    title: 'Access Denied',
                    description: typeof msg === 'string' ? msg : 'Permission denied.',
                    color: 'error'
                })
            }

            // Handle Server Errors (5xx)
            if (response.status >= 500) {
                const msg = response._data?.detail || response.statusText || 'Server Error'
                toast.add({
                    title: 'System Error',
                    description: typeof msg === 'string' ? msg : 'An unexpected error occurred.',
                    color: 'error'
                })
            }
        }
    })
}


