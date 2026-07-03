// In-memory only: lets a driver's location pings reach the right client without a
// DB lookup per ping. Resets on restart and won't work across multiple server
// instances - fine for a single-process MVP, but would need a shared store (e.g.
// Redis) before scaling horizontally.
const activeRideByDriver = new Map();

function setActiveRide(driverId, info) {
  activeRideByDriver.set(driverId, info);
}

function clearActiveRide(driverId) {
  activeRideByDriver.delete(driverId);
}

function getActiveRide(driverId) {
  return activeRideByDriver.get(driverId);
}

module.exports = { setActiveRide, clearActiveRide, getActiveRide };
