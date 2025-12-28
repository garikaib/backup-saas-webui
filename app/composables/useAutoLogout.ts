
export const useAutoLogout = () => {
    const authStore = useAuthStore()
    const config = useRuntimeConfig()

    // 30 minutes in ms
    const IDLE_TIMEOUT = 30 * 60 * 1000
    // Check interval
    const CHECK_INTERVAL = 60 * 1000

    const lastActivity = ref(Date.now())
    let timer: NodeJS.Timeout | null = null

    function updateActivity() {
        lastActivity.value = Date.now()
    }

    function checkIdle() {
        if (!authStore.isAuthenticated) return

        const now = Date.now()
        if (now - lastActivity.value > IDLE_TIMEOUT) {
            console.log('User idle for too long, logging out')
            authStore.logout()
            // Optional: Show toast? authStore.logout redirects to login which is good.
        }
    }

    function init() {
        if (process.server) return

        // Events to track
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll']

        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        // Check periodically
        timer = setInterval(checkIdle, CHECK_INTERVAL)
    }

    function destroy() {
        if (process.server) return

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
        events.forEach(event => {
            window.removeEventListener(event, updateActivity)
        })

        if (timer) clearInterval(timer)
    }

    return {
        init,
        destroy
    }
}
