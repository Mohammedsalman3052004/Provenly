'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ToastItem { id: number; text: string; kind: 'ok' | 'err'; action?: { label: string; run: () => void } }
interface Ctx { toast: (text: string, opts?: { kind?: 'ok' | 'err'; action?: ToastItem['action']; ms?: number }) => void }
const ToastCtx = createContext<Ctx>({ toast: () => undefined });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback<Ctx['toast']>((text, opts = {}) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, text, kind: opts.kind ?? 'ok', action: opts.action }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), opts.ms ?? (opts.action ? 7000 : 3500));
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>
            <span>{t.text}</span>
            {t.action && (
              <button className="btn btn-sm" onClick={() => { t.action!.run(); setItems((s) => s.filter((x) => x.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
