/**
 * Utility functions for handling media URLs
 */

// Base URL for the API
export const API_BASE_URL = "https://api.loryx.lol"

/**
 * Converts a relative media URL to an absolute URL
 * @param url The relative URL from the API
 * @returns The absolute URL
 */
export function getFullMediaUrl(url: string | undefined | null): string {
  if (!url) return ""

  // If the URL already starts with http:// or https://, return it as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  // Remove any quotes that might be in the URL string
  let cleanUrl = url.replace(/^["\\]+|["\\]+$/g, "")

  // If the URL starts with "static/" or "/static/", format it correctly
  if (cleanUrl.startsWith("static/") || cleanUrl.startsWith("/static/")) {
    // Remove leading slash if present to avoid double slashes
    if (cleanUrl.startsWith("/")) {
      cleanUrl = cleanUrl.substring(1)
    }
    return `${API_BASE_URL}/${cleanUrl}`
  }

  // If the URL doesn't start with a slash and it should, add one
  if (!cleanUrl.startsWith("/")) {
    cleanUrl = "/" + cleanUrl
  }

  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${cleanUrl}`
}

/**
 * Extracts the filename from a URL
 * @param url The URL
 * @returns The filename
 */
export function getFilenameFromUrl(url: string): string {
  // Extract the filename from the URL
  const parts = url.split("/")
  return parts[parts.length - 1]
}

/**
 * Determines if a URL is an image
 * @param url The URL to check
 * @returns True if the URL is an image
 */
export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif)$/i.test(url)
}

/**
 * Determines if a URL is a video
 * @param url The URL to check
 * @returns True if the URL is a video
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi)$/i.test(url)
}

