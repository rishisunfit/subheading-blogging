import { useState, useCallback, createContext } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  type DialogOptions,
  type DialogContextValue,
} from "@/components/Dialog";

// eslint-disable-next-line react-refresh/only-export-components
export const DialogContext = createContext<DialogContextValue | undefined>(
  undefined
);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({ message: "" });
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean | string | null) => void) | null
  >(null);

  const showDialog = useCallback(
    (dialogOptions: DialogOptions): Promise<boolean | string | null> => {
      return new Promise((resolve) => {
        setOptions(dialogOptions);
        setIsOpen(true);
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleClose = useCallback(
    (result: boolean | string | null) => {
      setIsOpen(false);
      if (resolvePromise) {
        resolvePromise(result);
        setResolvePromise(null);
      }
    },
    [resolvePromise]
  );

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Dialog isOpen={isOpen} onClose={handleClose} options={options} />
    </DialogContext.Provider>
  );
}
