// Adapter: bridges the old shadcn toast({ title, description, variant }) API to sonner.
// Components that already use `useToast()` work unchanged.
import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

function toast(options: ToastOptions) {
  const { title, description, variant } = options
  if (variant === 'destructive') {
    sonnerToast.error(title, { description })
  } else {
    sonnerToast(title, { description })
  }
}

export function useToast() {
  return { toast }
}
