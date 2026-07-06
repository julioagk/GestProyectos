'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  isDestructive?: boolean;
}

interface ToastOptions {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    resolve: null,
  });

  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title,
        message: options.message,
        isDestructive: !!options.isDestructive,
        resolve,
      });
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleConfirmClose = (value: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(value);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  return (
    <DialogContext.Provider value={{ confirm, showToast }}>
      {children}

      {/* Confirm Dialog Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                confirmState.isDestructive
                  ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
              }`}>
                <AlertCircle size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">{confirmState.title}</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {confirmState.message}
            </p>

            <div className="pt-2 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-3.5 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98] ${
                  confirmState.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/10'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/10'
                }`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2.5 max-w-xs w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3 rounded-xl border pointer-events-auto shadow-lg flex items-start gap-2.5 transition-all animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/20 text-slate-200'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/20 text-slate-200'
                : 'bg-slate-900/95 border-sky-500/20 text-slate-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle size={15} className="text-emerald-400" />
              ) : toast.type === 'error' ? (
                <AlertCircle size={15} className="text-rose-450" />
              ) : (
                <Info size={15} className="text-sky-400" />
              )}
            </div>
            <p className="text-xs font-medium flex-1 pr-1">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
