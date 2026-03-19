export type RegistrationInput = {
  fullName: string
  email: string
  gender: string
  dateOfBirth: string
  address: string
  highestQualification: string
  schoolCollegeName: string
  yearOfStudy: string
  mobileNumber: string
  preferredBatchTime: string
  courseSelected: string
  howDidYouHear: string
  paymentMode: string
  status: 'Pending' | 'Confirmed' | 'Rejected'
  promoCode?: string
}

export type RegistrationRow = RegistrationInput & {
  id: number
  createdAt: string
  discount_amount?: number
}

export type Course = {
  id: number
  title: string
  duration: string
  description: string
  icon: string
  color: string
  features: string[]
  imageUrl?: string
  syllabusUrl?: string
  totalFee?: number
  isActive: boolean
  isPromoted: boolean
  badgeText?: string
  createdAt: string
}

export type Payment = {
  id: number
  registration_id: number
  amount_paid: number
  payment_type: 'Full' | 'Installment 1' | 'Installment 2'
  payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'DD'
  discount_amount?: number
  date: string
  remarks?: string
  registrations?: { fullName: string; mobileNumber: string; courseSelected?: string }
}

export type Material = {
  id: number
  course_id?: number | null
  title: string
  file_url: string
  description?: string
  created_at: string
}

export type StudentDashboardData = {
  student: RegistrationRow
  attendance: { registration_id: number; date: string; status: string }[]
  attendancePercent: number
  payments: Payment[]
  materials: Material[]
  syllabusUrl?: string
}

export type AdminAnalytics = {
  revenueTrend: { name: string; value: number }[]
  conversionRate: number
  totalRegistrations: number
  confirmedStudents: number
}

