/**
 * High-performance image optimization utilities for GRAVVY.
 * Dynamically resizes images (especially Unsplash CDN) to match actual display dimensions,
 * drastically reducing byte size, memory usage, and image decode CPU time.
 */

// Global in-memory cache of already-loaded images so scrolling back up is 100% instantaneous
export const loadedImageMemoryCache = new Set<string>();

/**
 * Optimizes an image URL for the requested display width and quality.
 * Works seamlessly with Unsplash CDN and provides fallback for other URLs.
 */
export function optimizeImageUrl(url: string, targetWidth = 320, quality = 70): string {
  if (!url || typeof url !== 'string') return url;

  // Optimize Unsplash images
  if (url.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', targetWidth.toString());
      urlObj.searchParams.set('q', quality.toString());
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      return urlObj.toString();
    } catch {
      // If URL parsing fails, perform regex replacement
      return url
        .replace(/w=\d+/, `w=${targetWidth}`)
        .replace(/q=\d+/, `q=${quality}`);
    }
  }

  return url;
}

/**
 * Image dimensions based on placement:
 * - thumbnail / card: ~320px (retina for 160-190px mobile container)
 * - icon: ~80px
 * - detail: ~640px
 * - zoom: ~1000px
 */
export const ImageSizes = {
  ICON: 80,
  CARD: 320,
  DETAIL: 640,
  HERO: 800,
  ZOOM: 1000,
} as const;
