package repository

import (
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// GetNotifications returns all admin notifications, newest first.
func (r *SupabaseRepository) GetNotifications() ([]model.AdminNotification, error) {
	rows, err := r.db.Query(`
		SELECT id, type, message, post_id, is_read, created_at
		FROM admin_notifications
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []model.AdminNotification
	for rows.Next() {
		var n model.AdminNotification
		if err := rows.Scan(&n.ID, &n.Type, &n.Message, &n.PostID, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		notifications = append(notifications, n)
	}

	return notifications, rows.Err()
}

// GetUnreadNotificationCount returns count of unread notifications.
func (r *SupabaseRepository) GetUnreadNotificationCount() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM admin_notifications WHERE is_read = false`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return count, nil
}

// MarkNotificationRead marks a notification as read.
func (r *SupabaseRepository) MarkNotificationRead(id string) error {
	result, err := r.db.Exec(`UPDATE admin_notifications SET is_read = true WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to mark notification read: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("notification with id %q not found", id)
	}
	return nil
}

// MarkAllNotificationsRead marks all notifications as read.
func (r *SupabaseRepository) MarkAllNotificationsRead() error {
	_, err := r.db.Exec(`UPDATE admin_notifications SET is_read = true WHERE is_read = false`)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications read: %w", err)
	}
	return nil
}
