import React from "react";

export interface NotificationItemProps {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  message,
  isRead,
  createdAt,
  onMarkAsRead,
}) => {
  const handleMarkAsRead = () => {
    if (!isRead) {
      onMarkAsRead(id);
    }
  };

  return (
    <div
      className={`p-3 border-b cursor-pointer ${
        isRead ? "bg-white" : "bg-blue-50 font-semibold"
      }`}
      onClick={handleMarkAsRead}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleMarkAsRead();
        }
      }}
      aria-label={`Notification: ${message} - ${isRead ? "Read" : "Unread"}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p>{message}</p>
          <small className="text-gray-500">{new Date(createdAt).toLocaleString()}</small>
        </div>
        {!isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(id);
            }}
            className="text-blue-600 hover:underline"
            aria-label="Mark notification as read"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;