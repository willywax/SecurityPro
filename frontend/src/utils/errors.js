/**
 * Safely extract a human-readable message from an axios error response.
 * FastAPI validation errors return detail as an array of objects; this
 * collapses them to a single string so we never pass objects to toast/React.
 */
export const formatApiError = (error, fallback = 'An error occurred') => {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join('; ');
  return fallback;
};
