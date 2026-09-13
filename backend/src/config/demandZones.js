// Nouakchott's 9 real moughataas (administrative districts), across its 3
// regions (Ouest/Nord/Sud). Coordinates forward-geocoded via Nominatim
// (search API, not reverse) rather than guessed - mirrors how
// mobile/src/config/landmarks.js was built ("confirmed one by one via
// Nominatim"). Used by ride.service.js#getDemandZones to bucket pending ride
// requests by nearest district center (no polygon boundary data available,
// so "nearest center" is the Voronoi-style approximation of "which district").
const DEMAND_ZONES = [
  { name: 'Tevragh Zeina', lat: 18.1111443, lng: -16.0038402 },
  { name: 'Ksar', lat: 18.1049033, lng: -15.9644337 },
  { name: 'Sebkha', lat: 18.0711667, lng: -16.0026068 },
  { name: 'Teyarett', lat: 18.1591445, lng: -15.9271893 },
  { name: 'Toujounine', lat: 18.0724322, lng: -15.9099003 },
  { name: 'Dar Naim', lat: 18.1013451, lng: -15.9276250 },
  { name: 'El Mina', lat: 18.0218445, lng: -16.0094419 },
  { name: 'Arafat', lat: 18.0459512, lng: -15.9632837 },
  { name: 'Riyadh', lat: 18.0107143, lng: -15.9553260 },
];

module.exports = { DEMAND_ZONES };
