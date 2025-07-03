import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import NotificationModal, { NotificationType } from '../components/NotificationModal';

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, title?: string) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [notificationProps, setNotificationProps] = useState<{
    type: NotificationType;
    message: string;
    title?: string;
  }>({
    type: 'info',
    message: '',
  });

  const showNotification = useCallback((type: NotificationType, message: string, title?: string) => {
    setNotificationProps({
      type,
      message,
      title,
    });
    setShowModal(true);
  }, []);

  const hideNotification = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <NotificationModal
        show={showModal}
        type={notificationProps.type}
        message={notificationProps.message}
        title={notificationProps.title}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
