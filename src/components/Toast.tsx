import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastItem, ToastKind } from '../lib/types';

export interface ToastInput {
  kind: ToastKind;
  title: string;
  message?: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 6500);
  }, [dismiss]);
  return useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
}

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const KIND_STYLES: Record<ToastKind, { accent: string; icon: string }> = {
  success: { accent: 'border-l-leaf', icon: 'text-leaf' },
  error: { accent: 'border-l-coral', icon: 'text-coral' },
  info: { accent: 'border-l-amber', icon: 'text-amber' },
};

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2.5" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        const style = KIND_STYLES[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={`hard-sm toast-in flex items-start gap-3 rounded-xl border border-ink ${style.accent} border-l-[5px] bg-card px-4 py-3`}
          >
            <Icon size={19} strokeWidth={2.2} className={`mt-0.5 shrink-0 ${style.icon}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{t.message}</p>}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-ink-soft transition-colors hover:bg-cream hover:text-ink"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
