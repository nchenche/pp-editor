const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const DEPICT_2D_URL = `${API_BASE_URL}/api/core/molecules/depiction/2d`;

export { API_BASE_URL, DEPICT_2D_URL };