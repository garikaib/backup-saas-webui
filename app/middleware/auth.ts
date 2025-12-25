export default defineNuxtRouteMiddleware((to) => {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated && to.path !== '/login' && to.path !== '/signup') {
        return navigateTo('/login')
    }
})
