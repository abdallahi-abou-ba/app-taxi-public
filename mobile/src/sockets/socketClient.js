import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/env';

// auth as a function is re-invoked by socket.io on every (re)connection
// attempt - automatic or manual - so a token refreshed after this socket was
// created is picked up on the next attempt without recreating the socket.
export function createSocket(getToken) {
  return io(getSocketUrl(), {
    auth: (callback) => callback({ token: getToken() }),
    transports: ['websocket'],
  });
}
