import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { createSocket } from '../sockets/socketClient';
import { PROACTIVE_TOKEN_REFRESH_MS } from '../config/constants';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { status, getAccessToken, refreshTokens } = useAuth();
  const [socket, setSocket] = useState(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    if (status !== 'signedIn') {
      setSocket(null);
      return;
    }

    tokenRef.current = getAccessToken();
    const s = createSocket(() => tokenRef.current);
    setSocket(s);

    // Auth failures surface as a generic connect_error (socket.io doesn't
    // distinguish "bad token" from "server unreachable" here). Refreshing
    // and updating the ref is harmless either way - the next automatic
    // reconnect attempt (socket.io's own backoff) will use the fresh token.
    const handleConnectError = async () => {
      const token = await refreshTokens();
      if (token) tokenRef.current = token;
    };
    s.on('connect_error', handleConnectError);

    const proactiveRefresh = setInterval(async () => {
      const token = await refreshTokens();
      if (token) tokenRef.current = token;
    }, PROACTIVE_TOKEN_REFRESH_MS);

    return () => {
      s.off('connect_error', handleConnectError);
      clearInterval(proactiveRefresh);
      s.disconnect();
      setSocket(null);
    };
  }, [status, getAccessToken, refreshTokens]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
