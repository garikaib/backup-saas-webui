import { defineStore } from 'pinia'

export type ThemePreset = 'ocean-light' | 'forest-light' | 'midnight-dark' | 'charcoal-dark'

export interface ThemeConfig {
    id: ThemePreset
    name: string
    description: string
    mode: 'light' | 'dark'
    colors: {
        primary: string
        neutral: string
    }
}

export const themePresets: ThemeConfig[] = [
    {
        id: 'ocean-light',
        name: 'Ocean Light',
        description: 'Fresh blue tones with a clean look',
        mode: 'light',
        colors: {
            primary: 'sky',
            neutral: 'slate'
        }
    },
    {
        id: 'forest-light',
        name: 'Forest Light',
        description: 'Natural green tones for a calm feel',
        mode: 'light',
        colors: {
            primary: 'emerald',
            neutral: 'stone'
        }
    },
    {
        id: 'midnight-dark',
        name: 'Midnight Dark',
        description: 'Deep purple tones for night owls',
        mode: 'dark',
        colors: {
            primary: 'violet',
            neutral: 'zinc'
        }
    },
    {
        id: 'charcoal-dark',
        name: 'Charcoal Dark',
        description: 'Classic dark theme with neutral tones',
        mode: 'dark',
        colors: {
            primary: 'blue',
            neutral: 'neutral'
        }
    }
]

export const useThemeStore = defineStore('theme', () => {
    const colorMode = useColorMode()
    const appConfig = useAppConfig()

    // Get saved theme from localStorage or default
    const savedTheme = useState<ThemePreset>('selected_theme', () => {
        if (import.meta.client) {
            const stored = localStorage.getItem('theme_preset')
            if (stored && themePresets.find(t => t.id === stored)) {
                return stored as ThemePreset
            }
        }
        return 'ocean-light'
    })

    const currentTheme = computed((): ThemeConfig => {
        return themePresets.find(t => t.id === savedTheme.value) ?? themePresets[0]!
    })

    const lightThemes = computed(() => themePresets.filter(t => t.mode === 'light'))
    const darkThemes = computed(() => themePresets.filter(t => t.mode === 'dark'))

    function setTheme(themeId: ThemePreset) {
        const theme = themePresets.find(t => t.id === themeId)
        if (!theme) return

        savedTheme.value = themeId

        // Persist to localStorage
        if (import.meta.client) {
            localStorage.setItem('theme_preset', themeId)
        }

        // Apply colors to app config
        appConfig.ui.colors.primary = theme.colors.primary
        appConfig.ui.colors.neutral = theme.colors.neutral

        // Set color mode
        colorMode.preference = theme.mode
    }

    // Initialize theme on mount
    function initTheme() {
        const theme = currentTheme.value
        appConfig.ui.colors.primary = theme.colors.primary
        appConfig.ui.colors.neutral = theme.colors.neutral
        colorMode.preference = theme.mode
    }

    return {
        savedTheme,
        currentTheme,
        lightThemes,
        darkThemes,
        themePresets,
        setTheme,
        initTheme
    }
})
