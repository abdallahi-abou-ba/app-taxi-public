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

export function deleteAccount(password) {
  return api.delete('/api/users/me', { password });
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
