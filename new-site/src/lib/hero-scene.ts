import type { GlassOptions } from '../scripts/glass-name';

/** Shared by live glass and poster capture. Geometry and lighting are prepared offline. */
export function heroScene(width: number): GlassOptions {
  const phone = width <= 700;
  return {
    geometry: `/3d/gforce-glass-original-${phone ? 'mobile' : 'desktop'}`,
    sky: '/media/img/hero-cloud-contrast.webp',
    fill: phone ? .94 : .86,
  };
}
