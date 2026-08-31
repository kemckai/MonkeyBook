import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/MonkeyContext';

/**
 * Single app-wide WebSocket; dispatches DOM events so Feed, Header, etc. can subscribe.
 * Only connects when the user is logged in (session cookie required server-side).
 */
export default function WebSocketBridge() {
  const { user } = useAuth();

  useWebSocket((event, data) => {
    window.dispatchEvent(new CustomEvent('monkeybook-ws', { detail: { event, data } }));
  }, { enabled: !!user });

  return null;
}
