import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`${sizeClasses[size]} w-[calc(100%-2rem)] rounded-xl border border-border bg-surface text-text-primary p-0 shadow-xl backdrop:bg-black/50`}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-surface-tertiary transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>
      <div className="px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </dialog>
  );
}
