import * as Ably from 'ably';
import { getRealtimeToken } from '../api/realtimeApi';

// Thin adapter over Ably's Realtime client, exposing the same .on/.off/
// .disconnect shape the old socket.io-client instance had, so none of the
// screens consuming useSocket() (DriverHomeScreen, both ActiveRideScreens,
// WaitingForDriverScreen) need to change - only the connection plumbing
// (this file + SocketContext.js) does.
//
// authCallback re-runs on every (re)connection attempt - automatic or
// manual - and Ably also calls it proactively shortly before a token
// expires, reusing the same token-refresh-aware `api` client the rest of the
// app uses, so an expired token is handled the same way REST calls handle
// it, not reimplemented here.
export function createSocket(userId) {
  const client = new Ably.Realtime({
    authCallback: async (tokenParams, callback) => {
      try {
        const tokenRequest = await getRealtimeToken();
        callback(null, tokenRequest);
      } catch (err) {
        callback(err, null);
      }
    },
  });

  const channel = client.channels.get(`user:${userId}`);
  // Ably's subscribe/unsubscribe take the listener instance itself, not the
  // event name alone - this map lets off(event, cb) find the exact wrapped
  // listener that on(event, cb) registered for that same cb.
  const listeners = new Map();

  return {
    on(event, cb) {
      const wrapped = (message) => cb(message.data);
      listeners.set(cb, wrapped);
      channel.subscribe(event, wrapped);
    },
    off(event, cb) {
      const wrapped = listeners.get(cb);
      if (wrapped) channel.unsubscribe(event, wrapped);
      listeners.delete(cb);
    },
    disconnect() {
      client.close();
    },
  };
}
