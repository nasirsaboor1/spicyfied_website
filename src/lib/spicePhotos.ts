import { resolveImageUrl } from './products';

/**
 * Real product photography (already shot and uploaded for the catalog)
 * used for the ambient hero/scroll animation. Deliberately NOT
 * illustration - the brand's whole premise is authenticity, so the
 * moving elements on the page are actual photos of what's sold, not
 * drawings standing in for them.
 */
export const SCROLL_SPICE_PHOTOS = {
  cardamom: resolveImageUrl('/Cardamom (1)-min.JPG'),
  cinnamon: resolveImageUrl('/Cinnamon (1)-min.JPG'),
  clove: resolveImageUrl('/Clove (1)-min.JPG'),
  starAnise: resolveImageUrl('/Star Anise (1)-min.JPG'),
  pepper: resolveImageUrl('/Pepper (1)-min.JPG'),
};
