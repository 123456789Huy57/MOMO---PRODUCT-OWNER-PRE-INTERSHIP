import { NextResponse } from 'next/server';
export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
