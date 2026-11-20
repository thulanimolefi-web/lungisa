'use client'
// Client helper: same as fetch, but attaches the signed-in user's access token
// so API routes can verify who is calling (B07/B08).
import { supabase } from './supabase'

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json')
  return fetch(input, { ...init, headers })
}
