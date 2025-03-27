export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return inputs.filter(Boolean).join(" ")
}

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

  // If the URL doesn't start with a slash and it should, add one
  if (!cleanUrl.startsWith("/") && !cleanUrl.startsWith("static/")) {
    cleanUrl = "/" + cleanUrl
  }

  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${cleanUrl}`
}

