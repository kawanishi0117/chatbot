import React, { createContext, useContext, useState, ReactNode } from 'react';
import AlertModal from '../components/AlertModal';

export type AlertType = 'info' | 'success' | 'warning' | 'error';
export type ModalType = 'alert' | 'confirm';

export interface AlertConfig {
  type: ModalType;
  title?: string;
  message: string;
  alertType?: AlertType;
  confirmText?: string;
  cancelText?: string;
}

interface AlertState {
  isOpen: boolean;
  config: AlertConfig | null;
  resolve: ((value: boolean) => void) | null;
}

interface AlertContextType {
  showAlert: (message: string, alertType?: AlertType, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    config: null,
    resolve: null,
  });

  const showAlert = (message: string, alertType: AlertType = 'info', title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        config: {
          type: 'alert',
          message,
          alertType,
          title,
          confirmText: 'OK',
        },
        resolve: () => {
          resolve();
        },
      });
    });
  };

  const showConfirm = (
    message: string,
    title?: string,
    confirmText: string = 'OK',
    cancelText: string = 'キャンセル'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        config: {
          type: 'confirm',
          message,
          title,
          confirmText,
          cancelText,
        },
        resolve,
      });
    });
  };

  const handleClose = (result: boolean = false) => {
    if (alertState.resolve) {
      alertState.resolve(result);
    }
    setAlertState({
      isOpen: false,
      config: null,
      resolve: null,
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {alertState.isOpen && alertState.config && (
        <AlertModal config={alertState.config} onClose={handleClose} />
      )}
    </AlertContext.Provider>
  );
};