type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  student?: {
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationFeed({
  title,
  eyebrow,
  notifications,
  emptyMessage,
}: {
  title: string;
  eyebrow?: string;
  notifications: NotificationItem[];
  emptyMessage: string;
}) {
  return (
    <section className="list-card notification-feed-card">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="notification-feed-header">
        <h3>{title}</h3>
        <span>{notifications.length} items</span>
      </div>

      {notifications.length === 0 ? (
        <p className="notification-feed-empty">{emptyMessage}</p>
      ) : (
        <div className="notification-feed-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={
                notification.readAt
                  ? 'notification-feed-item'
                  : 'notification-feed-item notification-feed-item-unread'
              }
            >
              <div className="notification-feed-item-top">
                <strong>{notification.title}</strong>
                <span>{formatNotificationDate(notification.createdAt)}</span>
              </div>
              <p>{notification.message}</p>
              {notification.student?.user ? (
                <small>
                  {notification.student.user.firstName} {notification.student.user.lastName}
                </small>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
