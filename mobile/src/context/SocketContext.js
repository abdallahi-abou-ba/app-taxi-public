import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { createSocket } from '../sockets/socketClient';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { status, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (status !== 'signedIn' || !user) {
      setSocket(null);
      return undefined;
    }

    // Token freshness is handled by the adapter's authCallback (see
    // sockets/socketClient.js), which reuses the same auth-aware `api`
    // client REST calls use - Ably itself re-invokes it before a token
    // expires, so no proactive refresh timer is needed here anymore.
    const s = createSocket(user.id);
    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [status, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
