import type { DialogProps } from '~/components/AppDialog.vue'

export interface DialogOptions {
    title?: string
    message?: string
    variant?: 'danger' | 'warning' | 'info' | 'success'
    confirmLabel?: string
    cancelLabel?: string
    icon?: string
}

// Global reactive state for the dialog
const dialogState = reactive({
    open: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    variant: 'info' as 'danger' | 'warning' | 'info' | 'success',
    type: 'confirm' as 'confirm' | 'alert',
    confirmLabel: '',
    cancelLabel: 'Cancel',
    icon: '',
    loading: false,
    resolver: null as ((value: boolean) => void) | null
})

export function useDialog() {
    /**
     * Show a confirmation dialog
     * @returns Promise<boolean> - true if confirmed, false if cancelled
     */
    function confirm(options: DialogOptions = {}): Promise<boolean> {
        return new Promise((resolve) => {
            dialogState.title = options.title || 'Confirm Action'
            dialogState.message = options.message || 'Are you sure you want to proceed?'
            dialogState.variant = options.variant || 'info'
            dialogState.type = 'confirm'
            dialogState.confirmLabel = options.confirmLabel || ''
            dialogState.cancelLabel = options.cancelLabel || 'Cancel'
            dialogState.icon = options.icon || ''
            dialogState.loading = false
            dialogState.resolver = resolve
            dialogState.open = true
        })
    }

    /**
     * Show an alert dialog (OK button only)
     * @returns Promise<void>
     */
    function alert(options: DialogOptions = {}): Promise<void> {
        return new Promise((resolve) => {
            dialogState.title = options.title || 'Notice'
            dialogState.message = options.message || ''
            dialogState.variant = options.variant || 'info'
            dialogState.type = 'alert'
            dialogState.confirmLabel = options.confirmLabel || 'OK'
            dialogState.cancelLabel = ''
            dialogState.icon = options.icon || ''
            dialogState.loading = false
            dialogState.resolver = () => resolve()
            dialogState.open = true
        })
    }

    /**
     * Handle confirm action from dialog
     */
    function handleConfirm() {
        if (dialogState.resolver) {
            dialogState.resolver(true)
            dialogState.resolver = null
        }
        dialogState.open = false
    }

    /**
     * Handle cancel action from dialog
     */
    function handleCancel() {
        if (dialogState.resolver) {
            dialogState.resolver(false)
            dialogState.resolver = null
        }
        dialogState.open = false
    }

    /**
     * Set loading state on dialog
     */
    function setLoading(loading: boolean) {
        dialogState.loading = loading
    }

    /**
     * Close the dialog
     */
    function close() {
        handleCancel()
    }

    return {
        // State (reactive, can be used for v-model binding)
        state: dialogState,

        // Methods
        confirm,
        alert,
        handleConfirm,
        handleCancel,
        setLoading,
        close
    }
}
