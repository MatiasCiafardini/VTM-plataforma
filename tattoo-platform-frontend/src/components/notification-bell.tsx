'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { AppRole } from '@/lib/session';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  metadata?: {
    studentId?: string;
    challengeId?: string;
    periodId?: string;
    [key: string]: unknown;
  } | null;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getDestination(role: AppRole, notification: NotificationItem) {
  if (notification.type === 'NEWS_PUBLISHED') {
    if (role === 'STUDENT') {
      return '/student';
    }

    if (role === 'MENTOR') {
      return '/mentor';
    }

    return '/admin?tab=settings';
  }

  if (notification.type === 'ACHIEVEMENT_COMPLETED') {
    if (role === 'STUDENT') {
      return '/student?tab=challenges';
    }

    if (role === 'MENTOR') {
      return '/mentor?tab=challenges';
    }

    return '/admin?tab=challenges';
  }

  if (notification.type === 'METRIC_REMINDER') {
    if (role === 'STUDENT') {
      return '/student?tab=results';
    }

    if (role === 'MENTOR') {
      return '/mentor?tab=results';
    }

    return '/admin?tab=results';
  }

  if (notification.type === 'ATTENTION_RISK') {
    if (role === 'MENTOR') {
      return '/mentor?tab=challenges';
    }

    return '/admin?tab=results';
  }

  if (role === 'ADMIN') {
    return '/admin';
  }

  if (role === 'MENTOR') {
    return '/mentor';
  }

  return '/student';
}

export function NotificationBell({
  notifications,
  role,
}: {
  notifications: NotificationItem[];
  role: AppRole;
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unreadCount = items.filter((notification) => !notification.readAt).length;

  async function deleteNotification(notificationId: string) {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('No pudimos eliminar la notificacion.');
    }
  }

  function removeLocal(notificationId: string) {
    setItems((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  }

  function handleDelete(
    event: React.MouseEvent<HTMLButtonElement>,
    notificationId: string,
  ) {
    event.stopPropagation();
    event.preventDefault();

    startTransition(async () => {
      try {
        await deleteNotification(notificationId);
        removeLocal(notificationId);
      } catch {
        return;
      }
    });
  }

  function handleOpenNotification(notification: NotificationItem) {
    const destination = getDestination(role, notification);

    startTransition(async () => {
      try {
        await deleteNotification(notification.id);
        removeLocal(notification.id);
      } finally {
        setIsOpen(false);
        router.push(destination);
        router.refresh();
      }
    });
  }

  return (
    <div className="notification-bell-shell">
      <button
        type="button"
        className={isOpen ? 'profile-circle profile-circle-active' : 'profile-circle'}
        aria-label="Ver notificaciones"
        title="Notificaciones"
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 17H5.8a1 1 0 0 1-.8-1.6l1-1.4V10a6 6 0 1 1 12 0v4l1 1.4a1 1 0 0 1-.8 1.6H15" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-popover">
          <div className="notification-popover-header">
            <strong>Notificaciones</strong>
            <span>{unreadCount} nuevas</span>
          </div>

          {items.length === 0 ? (
            <p className="notification-popover-empty">No hay alertas por ahora.</p>
          ) : (
            <div className="notification-popover-list">
              {items.map((notification) => (
                <div
                  key={notification.id}
                  className={
                    notification.readAt
                      ? 'notification-popover-item'
                      : 'notification-popover-item notification-popover-item-unread'
                  }
                >
                  <button
                    type="button"
                    className="notification-popover-item-button"
                    onClick={() => handleOpenNotification(notification)}
                    disabled={isPending}
                  >
                    <div className="notification-popover-item-top">
                      <strong>{notification.title}</strong>
                      <span>{formatNotificationDate(notification.createdAt)}</span>
                    </div>
                    <p>{notification.message}</p>
                  </button>
                  <div className="notification-popover-item-actions">
                    <button
                      type="button"
                      className="notification-popover-delete"
                      onClick={(event) => handleDelete(event, notification.id)}
                      disabled={isPending}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
