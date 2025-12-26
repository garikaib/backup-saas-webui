export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // Skip auth check for public routes
    if (to.path === '/login' || to.path === '/signup') {
        return
    }

    // Not authenticated - redirect to login
    if (!authStore.isAuthenticated) {
        return navigateTo('/login')
    }

    // Has token but no user data - fetch user profile
    // This happens on page refresh when token persists in cookie but user state is lost
    if (!authStore.user) {
        await authStore.fetchUser()

        // If fetchUser failed (token expired), redirect to login
        if (!authStore.user) {
            authStore.logout()
            return navigateTo('/login')
        }
    }
})
