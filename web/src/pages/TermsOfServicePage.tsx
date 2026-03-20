import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsOfServicePage() {
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <FileText size={20} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
      </div>
      <p className="text-xs text-slate-400 font-medium mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-slate-600 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By registering for or using the services provided by NiKii Computer Academy ("Academy", "we", "our"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">2. Enrollment & Registration</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>All registrations are subject to seat availability and Academy approval.</li>
            <li>You must provide accurate and complete information during registration.</li>
            <li>The Academy reserves the right to reject any registration without providing a reason.</li>
            <li>Admission is confirmed only after payment is received and processed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">3. Fees & Payments</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Course fees must be paid as per the agreed schedule (full or installment).</li>
            <li>Fees are non-refundable once the course has commenced, except in exceptional circumstances at the Academy's discretion.</li>
            <li>Late payment may result in temporary suspension of access to course materials or attendance.</li>
            <li>Receipts will be provided for all payments made.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">4. Attendance & Conduct</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Students are expected to maintain a minimum of 75% attendance to be eligible for certification.</li>
            <li>Respectful behavior towards staff, instructors, and fellow students is required at all times.</li>
            <li>Any form of misconduct, damage to Academy property, or disruptive behavior may result in immediate termination of enrollment without refund.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">5. Certification</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Certificates will be issued only upon successful completion of the course and meeting attendance requirements.</li>
            <li>All fees must be fully cleared before a certificate is issued.</li>
            <li>Certificates are State and Central government recognized and issued under applicable accreditation bodies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">6. Intellectual Property</h2>
          <p>
            All course materials, study guides, and content provided by NiKii Computer Academy are the intellectual property of the Academy. Students may not reproduce, distribute, or share these materials without prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">7. Limitation of Liability</h2>
          <p>
            NiKii Computer Academy shall not be liable for any indirect, incidental, or consequential damages arising from enrollment in or use of our courses and services. Our liability is limited to the fees paid by the student for the specific course enrolled.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">8. Changes to Terms</h2>
          <p>
            The Academy reserves the right to modify these Terms of Service at any time. Changes will be communicated to enrolled students. Continued use of our services after any changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">9. Governing Law</h2>
          <p>
            These Terms of Service are governed by the laws of India. Any disputes arising shall be subject to the jurisdiction of the courts in Erode District, Tamil Nadu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3">10. Contact Us</h2>
          <p>For any queries regarding these terms, please contact us:</p>
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
