import type { RegistrationInput, RegistrationRow, Course, Payment, Material, StudentDashboardData, AdminAnalytics } from '../types'

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  ''

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
    const error: any = new Error(err?.error ?? `Request failed (${res.status} ${res.statusText})`);
    if (err?.details) error.details = err.details;
    throw error;
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

export async function getRegistrations(adminKey: string, academicYear?: string) {
  return apiFetch<{ registrations: RegistrationRow[] }>(`/api/registrations${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`, {
    method: 'GET',
    adminKey,
  })
}

export async function deleteAllRegistrations(adminKey: string) {
  return apiFetch<{ ok: true; message: string }>('/api/registrations', {
    method: 'DELETE',
    adminKey,
  })
}

export async function deleteRegistration(adminKey: string, id: number) {
  return apiFetch<{ ok: true }>(`/api/registrations/${id}`, {
    method: 'DELETE',
    adminKey,
  })
}

export async function updateRegistrationStatus(adminKey: string, id: number, status: 'Pending' | 'Confirmed' | 'Rejected', discount_amount?: number) {
  return apiFetch<{ ok: true }>(`/api/registrations/${id}/status`, {
    method: 'PUT',
    adminKey,
    body: JSON.stringify({ status, discount_amount }),
  })
}

export async function updateRegistration(adminKey: string, id: number, data: Partial<RegistrationRow>) {
  return apiFetch<{ ok: true; registration: RegistrationRow }>(`/api/registrations/${id}`, {
    method: 'PUT',
    adminKey,
    body: JSON.stringify(data),
  })
}

export function registrationsCsvUrl(academicYear?: string) {
  return `${API_URL}/api/registrations.csv${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`
}

export function paymentsCsvUrl(academicYear?: string) {
  return `${API_URL}/api/admin/payments.csv${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`
}

// --- Courses CMS API ---

export async function getInitialData() {
  return apiFetch<{
    courses: Course[];
    settings: {
      batchTimes?: string[];
      promoCodes?: { code: string; discount: string; description: string }[];
      contactNumber?: string;
      address?: string;
      academicYears?: string[];
      currentAcademicYear?: string;
    }
  }>('/api/initial-data', {
    headers: { 'Cache-Control': 'no-cache' }
  })
}

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
    academicYears?: string[];
    currentAcademicYear?: string;
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

export async function getAttendance(adminKey: string, date: string, academicYear?: string) {
  return apiFetch<{ attendance: { registration_id: number; status: string }[] }>(`/api/attendance?date=${date}${academicYear ? `&academicYear=${encodeURIComponent(academicYear)}` : ''}`, {
    adminKey
  })
}

export async function getMonthlyAttendance(adminKey: string, month: string, academicYear?: string) {
  return apiFetch<{ attendance: { registration_id: number; date: string; status: string }[] }>(`/api/attendance/monthly?month=${month}${academicYear ? `&academicYear=${encodeURIComponent(academicYear)}` : ''}`, {
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

export async function getDashboardStats(adminKey: string, academicYear?: string) {
  return apiFetch<{
    courseDistribution: { name: string; value: number }[];
    registrationTrend: { date: string; count: number }[];
  }>(`/api/dashboard-stats${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`, { adminKey })
}

export async function getRegistrationStatus(mobile: string) {
  return apiFetch<{ fullName: string; courseSelected: string; status: string; createdAt: string }>(
    `/api/registration-status/${mobile}`,
  )
}
export async function getPublicCertificate(id: string) {
  const res = await fetch(`${API_URL}/api/public/certificates/${id}`);
  if (!res.ok) throw new Error("Certificate not found");
  return res.json();
}

export async function notifyCertificate(adminKey: string, id: number) {
  const res = await fetch(`${API_URL}/api/registrations/${id}/certificate-notify`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  });
  if (!res.ok) throw new Error("Failed to send notification");
  return res.json();
}

// --- Student Portal API ---

export async function studentLogin(mobileNumber: string, dateOfBirth: string) {
  return apiFetch<{ student: RegistrationRow }>('/api/student/login', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, dateOfBirth })
  })
}

export async function getStudentDashboard(id: number) {
  return apiFetch<StudentDashboardData>(`/api/student/dashboard/${id}`)
}

// --- Admin Phase 4 Extensions ---

export async function getAdminPayments(adminKey: string, academicYear?: string) {
  return apiFetch<{
    payments: Payment[];
    summary: {
      totalFullCount: number;
      totalInstalment1Count: number;
      pendingInst2Count: number;
      totalRevenue: number;
    };
    pendingSecondInstalment: Payment[];
  }>(`/api/admin/payments${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`, { adminKey })
}

export async function addAdminPayment(adminKey: string, payment: Omit<Payment, 'id' | 'date'>) {
  return apiFetch<{ ok: true; payment: Payment }>('/api/admin/payments', {
    method: 'POST',
    adminKey,
    body: JSON.stringify(payment)
  })
}

export async function getAdminMaterials() {
  return apiFetch<{ materials: Material[] }>('/api/admin/materials')
}

export async function addAdminMaterial(adminKey: string, material: Omit<Material, 'id' | 'created_at'>) {
  return apiFetch<{ ok: true; material: Material }>('/api/admin/materials', {
    method: 'POST',
    adminKey,
    body: JSON.stringify(material)
  })
}

export async function deleteAdminMaterial(adminKey: string, id: number) {
  return apiFetch<{ ok: true }>(`/api/admin/materials/${id}`, {
    method: 'DELETE',
    adminKey
  })
}

export async function getAdminAnalytics(adminKey: string) {
  return apiFetch<AdminAnalytics>('/api/admin/analytics', { adminKey })
}

export async function checkAbsentees(adminKey: string) {
  return apiFetch<{ ok: true; alertsSent: number }>('/api/admin/check-absentees', {
    method: 'POST',
    adminKey
  })
}
