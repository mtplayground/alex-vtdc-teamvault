import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div className={`toast toast--${toast.tone}`} key={toast.id}>
              <Icon size={18} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
