import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface NotificationMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: string;
  timestamp: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
}

interface WebSocketNotificationHook {
  isConnected: boolean;
  notifications: NotificationMessage[];
  sendMessage: (message: any) => void;
  subscribePattern: (pattern: string) => void;
  unsubscribePattern: (pattern: string) => void;
  lastNotification: NotificationMessage | null;
  setLastNotification: (notification: NotificationMessage | null) => void;
  connectionError: string | null;
}

export const useWebSocketNotifications = (): WebSocketNotificationHook => {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  console.log('🔍 WebSocket hook initialized:', {
    hasUser: !!user,
    hasToken: !!token,
    tokenLength: token?.length,
    userRole: user?.role,
    timestamp: new Date().toISOString()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [lastNotification, setLastNotification] = useState<NotificationMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || !token || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket connect skipped:', {
        hasUser: !!user,
        hasToken: !!token,
        currentState: wsRef.current?.readyState
      });
      return;
    }

    console.log('🚀 Attempting WebSocket connection for user:', user.username);
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket connection with authentication
      // Use dedicated WebSocket URL from environment variables or construct from API URL
      let wsBaseUrl;
      if (process.env.NEXT_PUBLIC_WS_URL) {
        wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL;
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';
        // Convert http to ws and ensure we have the correct path
        if (apiUrl.includes('/api/v1')) {
          wsBaseUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://').replace('/api/v1', '/api/v1/ws');
        } else {
          // Fallback: assume we need to add the full path
          const baseUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
          wsBaseUrl = `${baseUrl}/api/v1/ws`;
        }
      }
      
      // Ensure wsBaseUrl doesn't end with a slash to avoid double slashes
      wsBaseUrl = wsBaseUrl.replace(/\/$/, '');
      const wsUrl = `${wsBaseUrl}/realtime?token=${token}`;
      
      console.log('🌐 WebSocket connection details:', {
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1',
        wsBaseUrl,
        wsUrl,
        token: token ? `${token.substring(0, 10)}...` : 'null',
        hasToken: !!token,
        hasUser: !!user,
        userId: user?.id,
        userRole: user?.role,
        env: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL
        }
      });

      // Validate WebSocket URL format
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        console.error('❌ Invalid WebSocket URL format:', wsUrl);
        setConnectionError('Invalid WebSocket URL format');
        return;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected for notifications');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            // Heartbeat response
            return;
          }
          
          if (message.type === 'notification') {
            console.log('🔔 WebSocket received notification:', {
              id: message.id,
              title: message.title,
              type: message.type,
              priority: message.priority,
              timestamp: message.timestamp,
              sender: message.sender
            });

            const notification: NotificationMessage = {
              id: message.id,
              type: message.type,
              title: message.title,
              message: message.message,
              data: message.data,
              priority: message.priority,
              timestamp: message.timestamp,
              sender: message.sender
            };

            setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
            setLastNotification(notification);
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id
              });
            }
          }
          
          if (message.type === 'subscribed') {
            console.log(`Subscribed to pattern: ${message.pattern}`);
          }
          
          if (message.type === 'unsubscribed') {
            console.log(`Unsubscribed from pattern: ${message.pattern}`);
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket connection error:', {
          error,
          wsUrl,
          readyState: ws.readyState,
          url: ws.url,
          timestamp: new Date().toISOString(),
          errorType: error.type,
          errorMessage: error.message
        });
        setConnectionError(`WebSocket connection error: ${error.type || 'Unknown error'}`);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', {
        error,
        hasToken: !!token,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      });
      setConnectionError(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const subscribePattern = useCallback((pattern: string) => {
    console.log('📨 Sending subscription message for pattern:', pattern);
    sendMessage({ type: 'subscribe_pattern', pattern });
  }, [sendMessage]);

  const unsubscribePattern = useCallback((pattern: string) => {
    sendMessage({ type: 'unsubscribe_pattern', pattern });
  }, [sendMessage]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Connect on mount and when user/token changes
  useEffect(() => {
    if (user && token) {
      connect();

      // Subscribe to relevant patterns after connection
      const checkConnectionAndSubscribe = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('🔗 WebSocket connection established, subscribing to patterns...');
          try {
            // Subscribe to general notifications and user-specific notifications
            subscribePattern('general');
            subscribePattern(`user:${user.id}`);
            if (user.role) {
              subscribePattern(`role:${user.role}`);
            }
            console.log('📡 Subscribed to notification patterns for user:', user.username);
          } catch (error) {
            console.error('❌ Failed to subscribe to patterns:', error);
          }
        } else {
          console.log('⏳ WebSocket not ready yet, retrying...');
          // Connection not ready yet, check again in 100ms
          setTimeout(checkConnectionAndSubscribe, 100);
        }
      };

      // Start checking after initial delay
      setTimeout(checkConnectionAndSubscribe, 500);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect, subscribePattern]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    notifications,
    sendMessage,
    subscribePattern,
    unsubscribePattern,
    lastNotification,
    setLastNotification,
    connectionError
  };
};
