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
  isActive: boolean
  isPromoted: boolean
  badgeText?: string
  createdAt: string
}

