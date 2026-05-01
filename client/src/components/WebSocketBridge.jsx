import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Single app-wide WebSocket; dispatches DOM events so Feed, Header, etc. can subscribe.
 */
export default function WebSocketBridge() {
  useWebSocket((event, data) => {
    window.dispatchEvent(new CustomEvent('monkeybook-ws', { detail: { event, data } }));
  });
  return null;
}
