'use client';
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Có lỗi xảy ra');
  return data as T;
}

export function track(name: string, props: Record<string, unknown> = {}) {
  fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, props }) }).catch(() => {});
}
