export const useApiClient = () => {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()

    return $fetch.create({
        baseURL: config.public.apiBase,
        onRequest({ options }) {
            const currentToken = authStore.token
            if (currentToken) {
                const headers = new Headers(options.headers as HeadersInit)
                headers.set('Authorization', `Bearer ${currentToken}`)
                options.headers = headers
            }
        },
        onResponseError({ response }) {
            // Only logout on 401 if the user was authenticated and not in login flow
            if (response.status === 401 && authStore.isAuthenticated && !authStore.loggingIn) {
                authStore.logout()
            }
        }
    })
}


