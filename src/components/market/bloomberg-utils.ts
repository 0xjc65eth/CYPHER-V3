// Bloomberg Terminal shared utility functions (pure, no React)

export function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${fmt(n)}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function chgColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'text-[#e4e4e7]';
  return n >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

export function timeAgo(ts: number | string | null | undefined): string {
  if (!ts) return '—';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function heatColor(v: number | null): string {
  if (v == null) return 'bg-[#1a1a2e]';
  const abs = Math.min(Math.abs(v), 20);
  const intensity = Math.floor(40 + (abs / 20) * 180);
  if (v >= 0) return `bg-[rgb(0,${intensity},0)]`;
  return `bg-[rgb(${intensity},0,0)]`;
}

export async function apiFetch<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    // Ensure trailing slash for Next.js trailingSlash: true config (avoids 308 redirects)
    const normalizedUrl = url.includes('?')
      ? url.replace('?', '/?').replace('//?', '/?')
      : url.endsWith('/') ? url : url + '/';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(normalizedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.error) return { data: null, error: data.error };
    return { data, error: null };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { data: null, error: 'Request timeout' };
    }
    return { data: null, error: e instanceof Error ? e.message : 'Network error' };
  }
}
