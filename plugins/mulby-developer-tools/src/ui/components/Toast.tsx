import { useEffect } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

export interface ToastData {
  id: string
  kind: 'success' | 'error' | 'info'
  text: string
}

export function ToastHost({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.kind === 'error' ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const icon = toast.kind === 'success'
    ? <CheckCircle2 size={16} className="text-emerald-500" />
    : toast.kind === 'error'
      ? <XCircle size={16} className="text-rose-500" />
      : <Info size={16} className="text-indigo-500" />

  const ring = toast.kind === 'success'
    ? 'border-emerald-500/30'
    : toast.kind === 'error'
      ? 'border-rose-500/30'
      : 'border-indigo-500/30'

  return (
    <div
      role="alert"
      onClick={() => onDismiss(toast.id)}
      className={`glass-panel ${ring} rounded-xl px-3.5 py-2.5 shadow-lg flex items-start gap-2.5 cursor-pointer animate-[fadeIn_0.18s_ease-out]`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-sm text-slate-700 dark:text-slate-200 break-words leading-snug">{toast.text}</span>
    </div>
  )
}
