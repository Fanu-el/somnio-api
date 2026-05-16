/**
 * Formats seconds into a human-readable time string.
 * 
 * Examples:
 * - 30 seconds → "30 seconds"
 * - 60 seconds → "1 minute"
 * - 90 seconds → "1 minute and 30 seconds"
 * - 120 seconds → "2 minutes"
 * - 3600 seconds → "1 hour"
 * - 3661 seconds → "1 hour and 1 minute"
 * 
 * @param seconds - Number of seconds to format
 * @returns Human-readable time string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 0) return '0 seconds';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }
  
  // Join with "and" for the last part
  if (parts.length === 1) {
    return parts[0]!;
  } else if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  } else {
    // For 3 parts (hours, minutes, seconds)
    return `${parts[0]}, ${parts[1]} and ${parts[2]}`;
  }
}

/**
 * Formats seconds into a short human-readable time string.
 * 
 * Examples:
 * - 30 seconds → "30s"
 * - 60 seconds → "1m"
 * - 90 seconds → "1m 30s"
 * - 3600 seconds → "1h"
 * - 3661 seconds → "1h 1m"
 * 
 * @param seconds - Number of seconds to format
 * @returns Short human-readable time string
 */
export function formatTimeRemainingShort(seconds: number): string {
  if (seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }
  
  return parts.join(' ');
}
