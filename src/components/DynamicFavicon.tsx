'use client';

import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { FaviconType } from '@/types/settings';

const FAVICON_SVGS: Record<Exclude<FaviconType, 'custom'>, string> = {
  robot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e0e7ff"/>
      <stop offset="100%" style="stop-color:#c7d2fe"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="6" r="4" fill="#f59e0b"/>
  <rect x="30" y="8" width="4" height="8" fill="#6366f1"/>
  <rect x="12" y="16" width="40" height="32" rx="6" fill="url(#bodyGrad)"/>
  <rect x="16" y="20" width="32" height="24" rx="4" fill="url(#faceGrad)"/>
  <circle cx="24" cy="30" r="5" fill="#1e1b4b"/>
  <circle cx="40" cy="30" r="5" fill="#1e1b4b"/>
  <circle cx="25" cy="29" r="2" fill="#fff"/>
  <circle cx="41" cy="29" r="2" fill="#fff"/>
  <rect x="26" y="38" width="12" height="3" rx="1.5" fill="#6366f1"/>
  <rect x="6" y="24" width="6" height="16" rx="2" fill="url(#bodyGrad)"/>
  <rect x="52" y="24" width="6" height="16" rx="2" fill="url(#bodyGrad)"/>
  <rect x="18" y="50" width="28" height="12" rx="3" fill="url(#bodyGrad)"/>
  <rect x="22" y="54" width="20" height="4" rx="2" fill="#c7d2fe"/>
</svg>`,
  bot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 8V4H8"/>
  <rect width="16" height="12" x="4" y="8" rx="2"/>
  <path d="M2 14h2"/>
  <path d="M20 14h2"/>
  <path d="M15 13v2"/>
  <path d="M9 13v2"/>
</svg>`,
  brain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
  <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
  <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
  <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
  <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
  <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
  <path d="M6 18a4 4 0 0 1-1.967-.516"/>
  <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
</svg>`,
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  <path d="M20 3v4"/>
  <path d="M22 5h-4"/>
  <path d="M4 17v2"/>
  <path d="M5 18H3"/>
</svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="16" height="16" x="4" y="4" rx="2"/>
  <rect width="6" height="6" x="9" y="9" rx="1"/>
  <path d="M15 2v2"/>
  <path d="M15 20v2"/>
  <path d="M2 15h2"/>
  <path d="M2 9h2"/>
  <path d="M20 15h2"/>
  <path d="M20 9h2"/>
  <path d="M9 2v2"/>
  <path d="M9 20v2"/>
</svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
</svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"/>
  <polyline points="8 6 2 12 8 18"/>
</svg>`,
  terminal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 17 10 11 4 5"/>
  <line x1="12" x2="20" y1="19" y2="19"/>
</svg>`,
};

function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

export function DynamicFavicon() {
  const { settings, isLoading } = useSettings();

  useEffect(() => {
    if (isLoading) return;

    const favicon = settings?.appearance?.favicon || 'robot';
    const customUrl = settings?.appearance?.customFaviconUrl || '';

    let faviconUrl: string;

    if (favicon === 'custom' && customUrl) {
      faviconUrl = customUrl;
    } else if (favicon !== 'custom' && FAVICON_SVGS[favicon]) {
      faviconUrl = svgToDataUrl(FAVICON_SVGS[favicon]);
    } else {
      faviconUrl = svgToDataUrl(FAVICON_SVGS.robot);
    }

    // Update favicon
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [settings?.appearance?.favicon, settings?.appearance?.customFaviconUrl, isLoading]);

  return null;
}

export { FAVICON_SVGS, svgToDataUrl };
