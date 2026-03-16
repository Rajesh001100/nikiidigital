import type { RegistrationInput, RegistrationRow, Course } from '../types'

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:5174'

type ApiError = { error: string; details?: unknown }

async function apiFetch<T>(
  path: string,
  options?: (RequestInit & { adminKey?: string }) | undefined,
): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set('Accept', 'application/json')

  if (options?.adminKey) headers.set('x-admin-key', options.adminKey)
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const isJson = (res.headers.get('content-type') ?? '').includes(
    'application/json',
  )

  if (!res.ok) {
    const err = (isJson ? await res.json() : null) as ApiError | null
    const msg =
      err?.error ?? `Request failed (${res.status} ${res.statusText})`
    throw new Error(msg)
  }

  if (!isJson) {
    throw new Error('Unexpected response from server')
  }

  return (await res.json()) as T
}

export async function createRegistration(input: RegistrationInput) {
  return apiFetch<{ ok: true; registrationId: number }>('/api/registrations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getRegistrations(adminKey: string) {
  return apiFetch<{ registrations: RegistrationRow[] }>('/api/registrations', {
    method: 'GET',
    adminKey,
  })
}

export async function updateRegistrationStatus(adminKey: string, id: number, status: 'Pending' | 'Confirmed' | 'Rejected') {
  return apiFetch<{ ok: true }>(`/api/registrations/${id}/status`, {
    method: 'PUT',
    adminKey,
    body: JSON.stringify({ status }),
  })
}

export function registrationsCsvUrl() {
  return `${API_URL}/api/registrations.csv`
}

// --- Courses CMS API ---

export async function getCourses() {
  return apiFetch<{ courses: Course[] }>('/api/courses')
}

export async function createCourse(adminKey: string, course: Omit<Course, 'id' | 'createdAt'>) {
  return apiFetch<{ ok: true; course: Course }>('/api/courses', {
    method: 'POST',
    adminKey,
    body: JSON.stringify(course),
  })
}

export async function updateCourse(adminKey: string, id: number, course: Partial<Course>) {
  return apiFetch<{ ok: true; course: Course }>(`/api/courses/${id}`, {
    method: 'PUT',
    adminKey,
    body: JSON.stringify(course),
  })
}

export async function deleteCourse(adminKey: string, id: number) {
  return apiFetch<{ ok: true }>(`/api/courses/${id}`, {
    method: 'DELETE',
    adminKey,
  })
}

// --- Settings API ---

export async function getSettings() {
  return apiFetch<{
    batchTimes?: string[];
    promoCodes?: { code: string; discount: string; description: string }[];
    contactNumber?: string;
    address?: string;
  }>('/api/settings')
}

export async function updateSettings(adminKey: string, settings: any) {
  return apiFetch<{ ok: true }>('/api/settings', {
    method: 'POST',
    adminKey,
    body: JSON.stringify(settings)
  })
}

// --- Attendance API ---

export async function getAttendance(adminKey: string, date: string) {
  return apiFetch<{ attendance: { registration_id: number; status: string }[] }>(`/api/attendance?date=${date}`, {
    adminKey
  })
}

export async function updateAttendance(adminKey: string, date: string, records: { registrationId: number; status: string }[]) {
  return apiFetch<{ ok: true }>('/api/attendance', {
    method: 'POST',
    adminKey,
    body: JSON.stringify({ date, records })
  })
}

// --- Dashboard API ---

export async function getDashboardStats(adminKey: string) {
  return apiFetch<{
    courseDistribution: { name: string; value: number }[];
    registrationTrend: { date: string; count: number }[];
  }>('/api/dashboard-stats', { adminKey })
}

