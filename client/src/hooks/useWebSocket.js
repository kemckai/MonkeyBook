import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);

    ws.onmessage = (evt) => {
      try {
        const { event, data } = JSON.parse(evt.data);
        onMessageRef.current(event, data);
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);
}
