export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // Skip auth check for public routes
    if (to.path === '/login' || to.path === '/signup' || to.path.startsWith('/magic-link')) {
        return
    }

    // Not authenticated - redirect to login
    if (!authStore.isAuthenticated) {
        return navigateTo('/login')
    }

    // Has token but no user data - fetch user profile
    // This happens on page refresh when token persists in cookie but user state is lost
    if (!authStore.user) {
        try {
            await authStore.fetchUser()
        } catch (error: any) {
            // Only logout on 401 (token invalid/expired)
            // Don't logout on network errors or other temporary failures
            if (error?.response?.status === 401 || error?.statusCode === 401) {
                authStore.logout()
                return navigateTo('/login')
            }
            // For other errors, continue with the navigation
            // The page can handle showing an error state
            console.warn('[Auth Middleware] fetchUser failed, but continuing:', error?.message)
        }
    }
})

