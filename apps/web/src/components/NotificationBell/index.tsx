import { Bell, Check, CheckCheck, Share2, UserPlus, UserCheck, UserX } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { useGetNotificationsQuery, useMarkAllReadMutation, useMarkNotificationReadMutation } from '@/api/notificationsApi'
import type { Notification } from '@/api/notificationsApi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const typeIcon: Record<Notification['type'], React.ReactNode> = {
  CO_POST_RECEIVED: <Share2 className="h-4 w-4 text-blue-500" />,
  CO_POST_ACCEPTED: <Check className="h-4 w-4 text-green-500" />,
  CO_POST_DECLINED: <span className="text-xs text-destructive">✕</span>,
  CO_POST_CONTRIBUTED: <span className="text-xs text-purple-500">+</span>,
  PERSON_REQUEST_RECEIVED: <UserPlus className="h-4 w-4 text-blue-500" />,
  PERSON_REQUEST_ACCEPTED: <UserCheck className="h-4 w-4 text-green-500" />,
  PERSON_REQUEST_DECLINED: <UserX className="h-4 w-4 text-destructive" />,
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, { pollingInterval: 30000 })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAllRead] = useMarkAllReadMutation()

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markRead(notification.id)
    }
    if (notification.personId) {
      navigate({ to: '/my-people' })
    } else if (notification.postId) {
      navigate({ to: '/co-posts' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">No notifications yet</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0 ${
                  !notification.read ? 'bg-accent/40' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">{typeIcon[notification.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notification.read ? 'font-medium' : ''}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
