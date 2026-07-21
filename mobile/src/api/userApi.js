import { api } from './client';

export function getMe() {
  return api.get('/api/users/me');
}

export function updateMe(payload) {
  return api.patch('/api/users/me', payload);
}

export function updateAvailability(payload) {
  return api.patch('/api/users/me/availability', payload);
}

export function updatePushToken(pushToken) {
  return api.patch('/api/users/me/push-token', { pushToken });
}

export function deleteAccount({ password, otpCode } = {}) {
  return api.delete('/api/users/me', { password, otpCode });
}

export function requestPhoneOtp(phone) {
  return api.post('/api/users/me/phone/request-otp', { phone });
}

export function verifyPhoneOtp(phone, code) {
  return api.post('/api/users/me/phone/verify-otp', { phone, code });
}

export function getReferralInfo() {
  return api.get('/api/users/me/referrals');
}

export function getMyDocuments() {
  return api.get('/api/users/me/documents');
}

// `asset` is an expo-image-picker result asset ({ uri, mimeType }). React
// Native's fetch/FormData accepts a { uri, name, type } object in place of a
// real File/Blob for a picked file's URI.
export function uploadDocument(type, asset) {
  const formData = new FormData();
  const mimeType = asset.mimeType || 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';
  formData.append('file', { uri: asset.uri, name: `${type.toLowerCase()}.${extension}`, type: mimeType });
  return api.post(`/api/users/me/documents/${type}`, formData);
}

// The avatar image itself is fetched directly via an <Image> (raw bytes, not
// JSON) - see EditProfileScreen. Only upload/delete go through the API client.
export function uploadAvatar(asset) {
  const formData = new FormData();
  const mimeType = asset.mimeType || 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';
  formData.append('file', { uri: asset.uri, name: `avatar.${extension}`, type: mimeType });
  return api.post('/api/users/me/avatar', formData);
}

export function deleteAvatar() {
  return api.delete('/api/users/me/avatar');
}

export function getMySettlements() {
  return api.get('/api/users/me/settlements');
}

export function declareSettlementPaid(id, paymentMethod) {
  return api.patch(`/api/users/me/settlements/${id}/declare-paid`, { paymentMethod });
}

export function getMyNotifications() {
  return api.get('/api/users/me/notifications');
}

export function markNotificationsRead() {
  return api.patch('/api/users/me/notifications/read-all');
}
