import React from "react";
import { api } from "../../../utils/trpc";
import NotificationItem from "./NotificationItem";

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = React.useState<{
    id: string;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }[]>([]);
  const [loading, setLoading] = React.useState(true);

  const utils = api.useUtils();

  const { data, refetch } = api.notification.getNotifications.useQuery(
    { limit: 20, unreadOnly: false },
    { refetchOnWindowFocus: false }
  );

  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getNotifications.invalidate();
      refetch();
    },
  });

  React.useEffect(() => {
    if (data) {
      setNotifications(data);
      setLoading(false);
    }
  }, [data]);

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ notificationId: id });
  };

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  if (notifications.length === 0) {
    return <div>No notifications</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-md overflow-hidden">
      <h2 className="text-xl font-bold p-4 border-b">Notification Center</h2>
      <div role="list" aria-label="Notifications list">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            id={notification.id}
            type={notification.type}
            message={notification.message}
            isRead={notification.isRead}
            createdAt={notification.createdAt}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;