import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl;

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getSocketUrl() {
  return API_BASE_URL;
}
