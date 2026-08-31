import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(onMessage, { enabled = true } = {}) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const onMessageRef = useRef(onMessage);
  const connectRef = useRef(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);

    ws.onmessage = (evt) => {
      try {
        const { event, data } = JSON.parse(evt.data);
        if (event === 'troop_membership_changed') {
          if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
          ws.onclose = null;
          ws.close();
          connectRef.current?.();
          return;
        }
        onMessageRef.current(event, data);
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onclose = (evt) => {
      if (evt.code === 4401) return;
      reconnectTimeout.current = setTimeout(() => connectRef.current?.(), 3000);
    };

    wsRef.current = ws;
  }, [enabled]);

  connectRef.current = connect;

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      return undefined;
    }

    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect, enabled]);
}
