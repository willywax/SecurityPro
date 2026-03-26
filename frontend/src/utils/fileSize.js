/**
 * Format a byte count into a human-readable string.
 * Examples: 512 → "512 B", 25088 → "24.5 KB", 2411724 → "2.3 MB"
 */
export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
