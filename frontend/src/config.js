// In dev, prefer same-origin requests and let Vite proxy /api to the backend.
// This avoids CORS/preflight issues for PATCH/DELETE.
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);
const DEPICT_2D_URL = `${API_BASE_URL}/api/core/molecules/depiction/2d`;
const API_DB_URL = `${API_BASE_URL}/api/db`;
const API_URL = `${API_BASE_URL}/api`;
const API_MAIL_URL = import.meta.env.VITE_API_MAIL_URL || `${API_BASE_URL}/api/mail`;

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

/** Default database name. Change this value to target a different backend DB (e.g. 'test_db'). */
const DB_NAME = import.meta.env.VITE_DB_NAME || 'pepedit';

export { API_BASE_URL, DEPICT_2D_URL, API_DB_URL, API_URL, API_MAIL_URL, APP_VERSION, DB_NAME };