import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Header */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition mb-8"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Shield size={20} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
      </div>
      <p className="text-xs text-slate-400 font-medium mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-slate-600 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">1. Introduction</h2>
          <p>
            NiKii Computer Academy ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or enrol in our courses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">2. Information We Collect</h2>
          <p className="mb-3">We collect the following types of personal information when you register with us:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Full name, date of birth, and gender</li>
            <li>Email address and WhatsApp mobile number</li>
            <li>Permanent address</li>
            <li>Educational qualification and institution name</li>
            <li>Course selection and preferred batch time</li>
            <li>Payment mode preference</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">3. How We Use Your Information</h2>
          <p className="mb-3">We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Process your course registration and admission</li>
            <li>Send you updates about admission status, attendance, and payments via WhatsApp or email</li>
            <li>Issue official digital certificates upon course completion</li>
            <li>Improve our services and course offerings</li>
            <li>Contact you regarding your enrollment or academy events</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. All data is stored securely and access is restricted to authorized personnel only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">5. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. Your data may be shared with government certification bodies (State and Central) solely for the purpose of issuing recognized certificates.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">6. Cookies</h2>
          <p>
            Our website may use basic session cookies to improve your browsing experience. These cookies do not store any personally identifiable information and are automatically deleted when you close your browser.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">7. Your Rights</h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Request access to the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal requirements)</li>
            <li>Withdraw consent at any time by contacting us</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or how we handle your personal data, please contact us:
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1 text-sm font-medium">
            <p><span className="font-black text-slate-800">NiKii Computer Academy</span></p>
            <p>Anthiyur, Erode District, Tamil Nadu</p>
            <p>📞 +91 97505 34434</p>
            <p>🌐 nikiidigital.in</p>
          </div>
        </section>

      </div>
    </div>
  )
}
