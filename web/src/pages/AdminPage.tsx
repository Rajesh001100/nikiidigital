import { useEffect, useState } from 'react'
import { getRegistrations, deleteAllRegistrations, deleteRegistration, registrationsCsvUrl, paymentsCsvUrl, getCourses, createCourse, updateCourse, deleteCourse, updateRegistrationStatus, getSettings, updateSettings, getAttendance, updateAttendance, notifyCertificate, getAdminAnalytics, updateRegistration, getAdminMaterials, addAdminMaterial, deleteAdminMaterial, getAdminPayments, addAdminPayment, getAdminStaff, addAdminStaff, deleteAdminStaff, updateAdminStaffPassword, updateAdminKey } from '../lib/api'
import type { RegistrationRow, Course, AdminAnalytics, Material, Payment } from '../types'
import { LayoutDashboard, Users, BookOpen, Download, Plus, Trash2, Edit3, CheckCircle2, Settings, FileText, Send, Award, ShieldCheck, Key, Lock, UserPlus, UserMinus, ShieldAlert } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; rows: RegistrationRow[]; courses: Course[]; settings: any; attendance: any[]; analytics: AdminAnalytics; materials: Material[]; payments: Payment[]; paymentSummary: { totalFullCount: number; totalInstalment1Count: number; pendingInst2Count: number; totalRevenue: number }; pendingSecondInstalment: Payment[]; staff: any[] }
  | { status: 'error'; message: string }

const STORAGE_KEY = 'nikiidigital_admin_key'

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [activeTab, setActiveTab] = useState<'stats' | 'regs' | 'courses' | 'attendance' | 'certificates' | 'settings' | 'analytics' | 'payments' | 'staff'>('stats')
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<Course | null>(null)
  const [featuresTempString, setFeaturesTempString] = useState('')
  const [paymentForm, setPaymentForm] = useState<{
    payment_type: string;
    payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'DD';
    discount_amount: string;
    custom_amount: string;
    remarks: string;
  }>({
    payment_type: 'Full',
    payment_method: 'Cash',
    discount_amount: '',
    custom_amount: '',
    remarks: ''
  })
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const [csvBusy, setCsvBusy] = useState(false)


  // Edit & Modal State
  const [editingStudent, setEditingStudent] = useState<RegistrationRow | null>(null)
  const [studentPayment, setStudentPayment] = useState<RegistrationRow | null>(null)
  const [viewingStudentHistory, setViewingStudentHistory] = useState<RegistrationRow | null>(null)
  const [materialForm, setMaterialForm] = useState({ title: '', file_url: '', description: '', course_id: 0 })
  const [confirmingStudent, setConfirmingStudent] = useState<RegistrationRow | null>(null)
  const [confirmDiscount, setConfirmDiscount] = useState('')

  // Attendance State
  const [selectedBatch, setSelectedBatch] = useState('Batch - I (9.30am - 11.30am)')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [stagedAttendance, setStagedAttendance] = useState<Record<number, string>>({})
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)

  // Course Form State
  const [isEditingCourse, setIsEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState<Omit<Course, 'id' | 'createdAt'>>({
    title: '',
    duration: '',
    description: '',
    icon: 'bi-mortarboard-fill',
    color: 'from-blue-500 to-indigo-600',
    features: [],
    imageUrl: '',
    syllabusUrl: '',
    isActive: true,
    isPromoted: false,
    badgeText: ''
  })

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<any>({
    batchTimes: [],
    promoCodes: [],
    promoDiscount: 0,
    academicYears: ['2026-2027'],
    currentAcademicYear: '2026-2027'
  })
  const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem('nikiidigital_admin_year') ?? '')
  const [overviewDate, setOverviewDate] = useState(new Date().toISOString().split('T')[0])

  // Search & Filter State
  const [regSearch, setRegSearch] = useState('')
  const [regBatchFilter, setRegBatchFilter] = useState('All Batches')
  const [paySearch, setPaySearch] = useState('')
  const [payBatchFilter, setPayBatchFilter] = useState('All Batches')
  const [payRecSearch, setPayRecSearch] = useState('')
  const [payRecBatchFilter, setPayRecBatchFilter] = useState('All Batches')

  // Staff Account Form
  const [staffForm, setStaffForm] = useState({ username: '', password: '', full_name: '' })
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [adminKeyUpdate, setAdminKeyUpdate] = useState({ current: '', new: '', confirm: '' })

  const registrations = state.status === 'loaded' ? state.rows : []
  const courses = state.status === 'loaded' ? state.courses : []
  const attendance = state.status === 'loaded' ? state.attendance : []

  async function load(keyOverride?: string, yearOverride?: string) {
    const key = keyOverride ?? adminKey
    if (!key) return
    setState({ status: 'loading' })
    try {
      console.log("Fetching fresh data...")
      
      const sett = await getSettings();
      const activeYear = yearOverride || selectedYear || sett.currentAcademicYear || '2026-2027';
      if (!selectedYear) setSelectedYear(activeYear);
      if (sett) setSettingsForm(sett);

      const [r, c, att, ana, mat, pay, staffRes] = await Promise.all([
        getRegistrations(key, activeYear),
        getCourses(),
        getAttendance(key, attendanceDate, activeYear),
        getAdminAnalytics(key, activeYear),
        getAdminMaterials(),
        getAdminPayments(key, activeYear),
        getAdminStaff(key)
      ])
      setState({
        status: 'loaded',
        rows: r.registrations,
        courses: c.courses,
        settings: sett,
        attendance: att.attendance,
        analytics: ana,
        materials: mat.materials,
        payments: pay.payments,
        paymentSummary: pay.summary || { totalFullCount: 0, totalInstalment1Count: 0, pendingInst2Count: 0, totalRevenue: 0 },
        pendingSecondInstalment: pay.pendingSecondInstalment || [],
        staff: Array.isArray(staffRes?.staff) ? staffRes.staff : []
      })
    } catch (e: unknown) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  async function handleUpdateStatus(id: number, newStatus: 'Pending' | 'Confirmed' | 'Rejected' | 'Completed', discountAmount?: number) {
    try {
      await updateRegistrationStatus(adminKey, id, newStatus, discountAmount);
      void load(adminKey); // Refresh data
    } catch (err) {
      alert("Failed to update status");
    }
  }

  async function handleUpdateAdminKey(e: React.FormEvent) {
    e.preventDefault();
    if (adminKeyUpdate.new !== adminKeyUpdate.confirm) {
      alert("New keys do not match!");
      return;
    }
    if (adminKeyUpdate.new.length < 8) {
      alert("New access key must be at least 8 characters long.");
      return;
    }
    if (!confirm("This will change your administrative access key and log you out. Proceed?")) return;

    try {
      await updateAdminKey(adminKey, adminKeyUpdate.new);
      alert("Administrative Access Key updated successfully! Please login again with your new key.");
      localStorage.removeItem('nikiidigital_admin_key');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to update access key.");
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addAdminStaff(adminKey, staffForm);
      setStaffForm({ username: '', password: '', full_name: '' });
      setIsAddingStaff(false);
      void load(adminKey);
    } catch (err: any) {
      alert(err.message || "Failed to add staff");
    }
  }

  async function handleResetStaffPassword(id: number) {
    const newPass = prompt("Enter new password for staff member:");
    if (!newPass) return;
    try {
      await updateAdminStaffPassword(adminKey, id, { password: newPass });
      alert("Staff password reset successfully!");
      void load(adminKey);
    } catch (err) {
      alert("Failed to reset staff password");
    }
  }


  async function handleDeleteStaff(id: number) {
    if (!confirm("Delete this staff account?")) return;
    try {
      await deleteAdminStaff(adminKey, id);
      void load(adminKey);
    } catch (err) {
      alert("Failed to delete staff");
    }
  }

  useEffect(() => {
    if (adminKey) void load(adminKey)
  }, [])

  // Sync staged attendance when batch, date or data changes
  useEffect(() => {
    if (state.status !== 'loaded') return;
    const newStaged: Record<number, string> = {};
    const batchConfirmed = registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed');
    
    batchConfirmed.forEach(reg => {
      const existing = state.attendance.find(a => a.registration_id === reg.id && a.date === attendanceDate);
      newStaged[reg.id] = existing?.status || 'Present';
    });
    setStagedAttendance(newStaged);
  }, [selectedBatch, attendanceDate, state.status, attendance]);

  async function handleCourseSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEditingCourse) {
        await updateCourse(adminKey, isEditingCourse.id, courseForm)
      } else {
        await createCourse(adminKey, courseForm)
      }
      setIsEditingCourse(null)
      setFeaturesTempString('')
      setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '', totalFee: 0 })
      void load(adminKey)
    } catch (err: any) {
      const details = err.details?.fieldErrors;
      if (details) {
        const msg = Object.entries(details)
          .map(([field, errors]: [string, any]) => `${field}: ${errors.join(', ')}`)
          .join('\n');
        alert(`Validation Failed:\n${msg}`);
      } else {
        alert(err.message || "Action failed. Check console.");
      }
    }
  }

  async function handleDeleteCourse(id: number) {
    if (!confirm("Are you sure?")) return
    try {
      await deleteCourse(adminKey, id)
      void load(adminKey)
    } catch (err) {
      alert("Delete failed")
    }
  }

  async function downloadCsv() {
    setCsvBusy(true)
    try {
      const res = await fetch(registrationsCsvUrl(), { headers: { 'x-admin-key': adminKey } })
      if (!res.ok) throw new Error('CSV download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setCsvBusy(false)
    }
  }

  async function downloadPaymentsCsv() {
    setCsvBusy(true)
    try {
      const res = await fetch(paymentsCsvUrl(), { headers: { 'x-admin-key': adminKey } })
      if (!res.ok) throw new Error('Payment report download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setCsvBusy(false)
    }
  }

  function downloadPdf() {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text('NiKii Digital Academy', 14, 20)
    
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text('Student Registration Master List', 14, 28)
    
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34)
    doc.text(`Total Records: ${registrations.length}`, 14, 39)

    // Table
    const tableColumn = ["ID", "Student Name", "Email Address", "Contact", "Selected Course", "Status"]
    const tableRows = registrations.map(reg => [
      `#${reg.id}`,
      reg.fullName,
      reg.email,
      reg.mobileNumber,
      reg.courseSelected,
      reg.status
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle',
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [37, 99, 235], // blue-600
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { fontStyle: 'bold' },
        5: { halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      }
    })

    doc.save(`registrations_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function downloadDayPdf() {
    const doc = new jsPDF()
    const filteredRegs = registrations.filter(r => r.createdAt && r.createdAt.startsWith(overviewDate))
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text('NiKii Digital Academy', 14, 20)
    
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(`Registration Report: ${new Date(overviewDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 14, 28)
    
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34)
    doc.text(`Total Records for Day: ${filteredRegs.length}`, 14, 39)

    // Table
    const tableColumn = ["ID", "Student Name", "Email Address", "Contact", "Selected Course", "Status"]
    const tableRows = filteredRegs.map(reg => [
      `#${reg.id}`,
      reg.fullName,
      reg.email,
      reg.mobileNumber,
      reg.courseSelected,
      reg.status
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle',
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [37, 99, 235], // blue-600
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { fontStyle: 'bold' },
        5: { halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      }
    })

    doc.save(`registrations_${overviewDate}.pdf`)
  }

  async function handleBatchAttendanceSave() {
    const records = Object.entries(stagedAttendance).map(([regId, status]) => ({
      registrationId: Number(regId),
      status
    }));
    
    if (records.length === 0) return;
    
    setIsSavingAttendance(true);
    try {
      await updateAttendance(adminKey, attendanceDate, records);
      alert('Attendance recorded for ' + records.length + ' students');
      void load(adminKey);
    } catch {
      alert('Attendance update failed');
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleNotify(id: number) {
    try {
      await notifyCertificate(adminKey, id);
      alert("Notification sent successfully!");
    } catch (err) {
      alert("Failed to send notification via Email/WhatsApp");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings(adminKey, settingsForm);
      alert("Settings saved successfully!");
      void load(adminKey);
    } catch (err) {
      alert("Failed to save settings");
    }
  }

  // Phase 4 New Handlers
  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateRegistration(adminKey, editingStudent.id, editingStudent);
      alert("Student record updated successfully!");
      setEditingStudent(null);
      void load(adminKey);
    } catch (err) {
      alert("Failed to update student record");
    }
  }



  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addAdminMaterial(adminKey, materialForm);
      // Keep course_id so admin can add more materials to same course
      setMaterialForm(prev => ({ title: '', file_url: '', description: '', course_id: prev.course_id }));
      void load(adminKey);
    } catch (err) {
      alert("Failed to add material");
    }
  }

  async function handleDeleteMaterial(id: number) {
    if (!confirm("Delete this material?")) return;
    try {
      await deleteAdminMaterial(adminKey, id);
      void load(adminKey);
    } catch (err) {
      alert("Failed to delete material");
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!studentPayment) return;
    let amount = Number(paymentForm.custom_amount);
    if (!amount || isNaN(amount)) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      const disc = paymentForm.discount_amount ? Number(paymentForm.discount_amount) : 0;

      // If the student is still Pending, confirm them automatically during this first payment
      if (studentPayment.status === 'Pending') {
        await updateRegistrationStatus(adminKey, studentPayment.id, 'Confirmed', disc);
      }

      await addAdminPayment(adminKey, {
        registration_id: studentPayment.id,
        amount_paid: amount,
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        discount_amount: paymentForm.discount_amount ? Number(paymentForm.discount_amount) : undefined,
        remarks: paymentForm.remarks || `Via ${paymentForm.payment_method}`
      });
      setStudentPayment(null);
      setPaymentForm({ payment_type: 'Full', payment_method: 'Cash', discount_amount: '', custom_amount: '', remarks: '' });
      void load(adminKey);
    } catch (err) {
      alert("Failed to record payment");
    }
  }

  function generateAdmissionLetter(reg: RegistrationRow) {
    const doc = new jsPDF() as any;

    // --- HEADER SECTION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Student Id : REG-${reg.id.toString().padStart(4, '0')}`, 20, 15);
    doc.text(`Date : ${new Date().toLocaleDateString('en-IN')}`, 190, 15, { align: "right" });

    doc.setFontSize(28);
    doc.text("NiKii COMPUTER ACADEMY", 20, 30);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("A Central government Registered", 20, 38);
    doc.text("State Government and CSC certified", 20, 43);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const address = [
      "104, BHAVANI MAIN ROAD, UTHAYAM DEPARTMENT, ABOVE 1ST FLOOR,",
      "ANTHIYUR, ERODE DISTRICT - 638 501.",
      `Email: nikiiacademy@gmail.com`,
      `Ph : 9750534434 , 9865320076`
    ];
    doc.text(address, 20, 50);

    // Photo Box
    doc.setDrawColor(0, 0, 0);
    doc.rect(160, 25, 30, 40);
    doc.setFontSize(7);
    doc.text("Affix Passport", 175, 43, { align: "center" });
    doc.text("Size Photo", 175, 47, { align: "center" });

    // --- TITLE SECTION ---
    doc.setFillColor(255, 126, 0); // Orange
    doc.rect(75, 75, 60, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ADMISSION FORM", 105, 82, { align: "center" });

    // --- PERSONAL DETAILS SECTION ---
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(20, 95, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("PERSONAL DETAILS", 25, 101);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    let y = 115;
    const fieldX = 20;
    const labelX = 65;
    const col2X = 110;
    const label2X = 145;

    // Row 1: Name
    doc.setFont("helvetica", "bold");
    doc.text("Name of the Student", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${reg.fullName.toUpperCase()}`, labelX, y);
    y += 10;

    // Row 2: Father's Name
    doc.setFont("helvetica", "bold");
    doc.text("Father's / Guardian Name", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${(reg.fatherName || '').toUpperCase()}`, labelX, y);
    y += 10;

    // Row 3: DOB & Religion
    doc.setFont("helvetica", "bold");
    doc.text("Date of Birth", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${reg.dateOfBirth}`, labelX, y);
    
    doc.setFont("helvetica", "bold");
    doc.text("Religion     :", col2X, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${(reg.religion || '').toUpperCase()}`, label2X, y);
    y += 10;

    // Row 4: Nationality
    doc.setFont("helvetica", "bold");
    doc.text("Nationality", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${(reg.nationality || 'INDIAN').toUpperCase()}`, labelX, y);
    y += 10;

    // Row 5: Mobile & Gender
    doc.setFont("helvetica", "bold");
    doc.text("Mobile No", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${reg.mobileNumber}`, labelX, y);

    doc.setFont("helvetica", "bold");
    doc.text("Gender       :", col2X, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${reg.gender === 'Male' ? 'Male [X]  Female [ ]' : 'Male [ ]  Female [X]'}`, label2X, y);
    y += 10;

    // Row 6: Mail ID
    doc.setFont("helvetica", "bold");
    doc.text("Mail ID", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${reg.email}`, labelX, y);
    y += 10;

    // Row 7: Address
    doc.setFont("helvetica", "bold");
    doc.text("Address", fieldX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`:   ${reg.address.toUpperCase()}`, labelX, y);
    y += 15;

    // --- COURSE SECTION ---
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(20, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("COURSE", 25, y + 6);
    y += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    const projectCourses = [
      "SCC", "KCA", "JCA", "DCA", "DCP", 
      "DWD", "DDTP", "DFA", "DHN", "Tally"
    ];

    let cx = 20;
    let cy = y;
    projectCourses.forEach((c, i) => {
      const isSelected = reg.courseSelected.includes(c) || 
                         (c === "Tally" && reg.courseSelected.includes("Tally"));
      
      doc.text(`${c}  [${isSelected ? 'X' : ' '}]`, cx, cy);
      cx += 35;
      if ((i + 1) % 5 === 0) {
        cx = 20;
        cy += 8;
      }
    });

    y = cy + 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Course Duration : ........................", 20, y);
    doc.text("Batch No : ...................", 85, y);
    doc.text(`Batch Time : ${reg.preferredBatchTime}`, 135, y);

    // --- SIGNATURE SECTION ---
    y = 270;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Signature of Applicant", 20, y);
    doc.text("Signature of Parent", 85, y);
    doc.text("Management", 155, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated document and does not require a physical signature.", 105, 285, { align: "center" });

    doc.save(`Admission_Form_${reg.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  function generateCertificate(reg: RegistrationRow) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    }) as any;

    const width = 297;
    const height = 210;

    // --- PREMIUM FRAME ---
    // Outer Gold Border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(3);
    doc.rect(8, 8, width - 16, height - 16);

    // Inner Blue Line
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, width - 24, height - 24);

    // Corner Ornaments
    const corners = [[8, 8], [width - 8, 8], [8, height - 8], [width - 8, height - 8]];
    corners.forEach(([x, y]) => {
      doc.setFillColor(212, 175, 55);
      doc.circle(x, y, 3, 'F');
      doc.setFillColor(30, 58, 138);
      doc.circle(x, y, 1.5, 'F');
    });

    // --- BACKGROUND WATERMARK ---
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(120);
    doc.setFont("helvetica", "bold");
    doc.text("NCA", width / 2, height / 2 + 15, { align: "center", angle: 0 });

    // --- LOGO PLACEHOLDER / TEXT HEADER ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text("NiKii Computer Academy", width / 2, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("An ISO 9001:2015 Certified Institution", width / 2, 48, { align: "center" });
    doc.text("State and Central Certified Academy • Anthiyur", width / 2, 54, { align: "center" });

    // --- MAIN TITLE ---
    doc.setTextColor(184, 134, 11);
    doc.setFontSize(50);
    doc.setFont("times", "bolditalic");
    doc.text("Certificate of Achievement", width / 2, 85, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("This is to certify that", width / 2, 100, { align: "center" });

    // --- STUDENT NAME ---
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(reg.fullName, width / 2, 115, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed the professional program in", width / 2, 130, { align: "center" });

    // --- COURSE NAME ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(reg.courseSelected, width / 2, 145, { align: "center" });

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Awarded on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, width / 2, 155, { align: "center" });

    // --- OFFICIAL SEAL ---
    doc.setFillColor(212, 175, 55);
    doc.circle(width - 45, 170, 15, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(width - 45, 170, 12, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("OFFICIAL SEAL", width - 45, 170, { align: "center" });
    doc.text("NCA", width - 45, 174, { align: "center" });

    // --- FOOTER ELEMENTS ---
    // Serial Number
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const certId = `CERT-${reg.id}-${new Date().getFullYear()}`;
    doc.text(`Certificate No: ${certId}`, 20, 195);
    doc.text(`Verification: nikiidigital.in/certificate/${reg.id}`, 20, 200);

    // Signatures
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(40, 185, 95, 185);
    doc.line(width - 150, 185, width - 95, 185);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DIRECTOR", 67.5, 192, { align: "center" });
    doc.text("AUTHORIZED SIGNATORY", width - 122.5, 192, { align: "center" });

    // Slogan
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "italic");
    doc.text("Education is the Power of Life!", width / 2, 200, { align: "center" });

    doc.save(`Certificate_${reg.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  if (state.status === 'idle' || !adminKey) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-600 text-white shadow-2xl shadow-blue-200">
          <LayoutDashboard size={48} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Admin Gateway</h1>
        <p className="mt-4 max-w-md text-base md:text-lg font-medium text-slate-500 leading-relaxed">
          Unlock the dashboard to manage courses, analyze trends, and view student registrations.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row w-full max-w-lg gap-4">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { const k = adminKey.trim(); setAdminKey(k); localStorage.setItem(STORAGE_KEY, k); void load(k) } }}
            placeholder="Enter Admin Access Key"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition shadow-sm"
          />
          <button
            onClick={() => { const k = adminKey.trim(); setAdminKey(k); localStorage.setItem(STORAGE_KEY, k); void load(k) }}
            className="rounded-2xl bg-slate-900 px-8 py-4 font-bold text-white hover:bg-slate-800 transition"
          >
            Authenticate
          </button>
        </div>
        {state.status === 'error' && <p className="mt-6 font-bold text-red-500">{state.message}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <header className="flex flex-wrap items-start md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">NiKii Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-slate-500 font-medium italic text-sm md:text-base">Welcome back, Administrator</p>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  localStorage.setItem('nikiidigital_admin_year', e.target.value);
                  void load(adminKey, e.target.value);
                }}
                className="bg-transparent text-sm font-black text-slate-800 outline-none cursor-pointer"
              >
                {(settingsForm.academicYears || ['2025-2026', '2026-2027']).map((y: string) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button onClick={() => load(adminKey)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Refresh Data">
              <i className={`bi bi-arrow-clockwise text-lg ${state.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={async () => {
              const first = confirm('âš ï¸ WARNING: This will permanently delete ALL student registrations, payments, and attendance records. This cannot be undone!');
              if (!first) return;
              const second = confirm('Final confirmation: Are you absolutely sure you want to delete ALL data?');
              if (!second) return;
              try {
                await deleteAllRegistrations(adminKey);
                alert('All registrations deleted successfully.');
                load(adminKey);
              } catch (e: any) {
                alert('Failed to delete: ' + (e as any).message);
              }
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 transition-all"
            title="Delete all registrations, payments and attendance"
          >
            <Trash2 size={16} />
            Delete All Data
          </button>
          {/* Tab bar - horizontally scrollable on mobile */}
          <div className="overflow-x-auto w-full md:w-auto -mx-1 px-1">
            <div className="flex gap-1 md:gap-3 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-100 w-max md:w-auto">
              {[
                { id: 'stats', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'regs', label: 'Registrations', icon: Users },
                { id: 'payments', label: 'Payments', icon: Send },
                { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
                { id: 'courses', label: 'CMS', icon: BookOpen },
                { id: 'certificates', label: 'Certificates', icon: Award },
                { id: 'staff', label: 'Staff', icon: ShieldCheck },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 md:gap-2 rounded-xl px-3 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      {state.status === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center p-8 bg-red-50 rounded-[2.5rem] border border-red-100 animate-in zoom-in-95 duration-500">
          <div className="h-20 w-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6">
            <Trash2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Authentication Error</h2>
          <p className="text-slate-500 max-w-sm font-medium mb-8">
            The access key you've provided is incorrect or expired. Please sign out and try again with the correct key.
          </p>
          <p className="text-red-600 font-bold mb-8 italic">"{state.message}"</p>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setAdminKey(''); setState({ status: 'idle' }); }}
            className="rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white hover:bg-slate-800 transition shadow-xl"
          >
            Reset Access Key
          </button>
        </div>
      )}

      {state.status === 'loaded' && (
        <div className="animate-in fade-in duration-500">
          {/* --- DASHBOARD OVERVIEW --- */}
          {activeTab === 'stats' && state.status === 'loaded' && (() => {
            const { payments, attendance } = state;
            
            // Financial Summary
            const totalCollected = (payments || []).reduce((s, p) => s + p.amount_paid, 0);
            const totalExpected = registrations.reduce((s, student) => {
              if (student.status !== 'Confirmed') return s;
              const course = courses.find(c => c.title === student.courseSelected);
              const fee = course?.totalFee || 0;
              const disc = student.discount_amount || 0;
              return s + Math.max(0, fee - disc);
            }, 0);
            const totalBalance = Math.max(0, totalExpected - totalCollected);
            
            // Attendance Summary (Batch-wise)
            const batchStats = (settingsForm.batchTimes || []).map((batch: string) => {
              const batchStudents = registrations.filter(r => r.preferredBatchTime === batch && r.status === 'Confirmed');
              const total = batchStudents.length;
              const absentCount = batchStudents.filter(reg => {
                const record = (attendance || []).find(a => a.registration_id === reg.id);
                return record && record.status === 'Absent';
              }).length;
              return { 
                batch, 
                current: total - absentCount, 
                total 
              };
            });

            return (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {/* Total Registrations */}
                  <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Registrations</p>
                      <p className="mt-3 text-5xl font-black text-slate-900">{registrations.length}</p>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={downloadPdf}
                        disabled={registrations.length === 0}
                        className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <FileText size={16} />
                        Export PDF
                      </button>
                    </div>
                  </div>

                  {/* Confirmed Admissions */}
                  <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Confirmed Admissions</p>
                    <p className="mt-3 text-5xl font-black text-emerald-600">{registrations.filter(r => r.status === 'Confirmed').length}</p>
                  </div>

                  {/* Conversion Rate */}
                  <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Conversion Rate</p>
                    <p className="mt-3 text-5xl font-black text-slate-900">
                      {registrations.length > 0
                        ? Math.round((registrations.filter(r => r.status === 'Confirmed').length / registrations.length) * 100)
                        : 0}%
                    </p>
                  </div>

                  {/* Day-wise Reports */}
                  <div className="rounded-3xl bg-white p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Day-wise Reports</p>
                      <input 
                        type="date" 
                        value={overviewDate}
                        onChange={(e) => setOverviewDate(e.target.value)}
                        className="text-xs font-bold border-none bg-slate-50 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/10"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-2xl font-black text-slate-900">
                            {registrations.filter(r => r.createdAt && r.createdAt.startsWith(overviewDate)).length}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100">
                          <p className="text-2xl font-black text-emerald-600">
                            {registrations.filter(r => r.createdAt && r.createdAt.startsWith(overviewDate) && r.status === 'Confirmed').length}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Success</p>
                        </div>
                      </div>
                      <button
                        onClick={downloadDayPdf}
                        disabled={registrations.filter(r => r.createdAt && r.createdAt.startsWith(overviewDate)).length === 0}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  <div className="flex flex-col rounded-[2.5rem] bg-white p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Financial Overview</h3>
                    <div className="grid grid-cols-2 gap-8 mt-auto">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Collected</p>
                        <p className="text-4xl font-black text-emerald-600">₹{totalCollected.toLocaleString()}</p>
                      </div>
                      <div className="pl-8 border-l border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Balance</p>
                        <p className="text-4xl font-black text-amber-500">₹{totalBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] bg-white p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Batch Attendance (Today)</h3>
                    <div className="space-y-4">
                      {batchStats.map((s: { batch: string; current: number; total: number }, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                          <p className="text-xs font-black text-slate-900">{s.batch}</p>
                          <p className="text-xl font-black text-slate-900">{s.current}<span className="text-slate-400 text-sm">/{s.total}</span></p>
                        </div>
                      ))}
                      {batchStats.length === 0 && <p className="text-xs italic text-slate-400">No batch timing set or attendance recorded today.</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

          {/* --- PAYMENTS TAB --- */}
          {activeTab === 'payments' && state.status === 'loaded' && (() => {
            const { payments, rows, courses } = state;
            
            const totalRevenue = payments.reduce((sum, p) => sum + p.amount_paid, 0);
            
            const settlementStats = rows.reduce((acc, student) => {
              if (student.status !== 'Confirmed') return acc;
              const course = courses.find(c => c.title === student.courseSelected);
              const baseFee = course?.totalFee || 0;
              const discount = student.discount_amount || 0;
              const netFee = Math.max(0, baseFee - discount);
              
              const paid = payments
                .filter(p => p.registration_id === student.id)
                .reduce((sum, p) => sum + p.amount_paid, 0);
              
              if (paid >= netFee && netFee > 0) acc.fullyPaid++;
              else if (paid > 0 && paid < netFee) acc.partiallyPaid++;
              else if (netFee > 0 && paid === 0) acc.noPayment++;
              
              return acc;
            }, { fullyPaid: 0, partiallyPaid: 0, noPayment: 0 });

            return (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-100">
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-3">Total Revenue</p>
                    <p className="text-4xl font-black">₹{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs mt-2 opacity-60">All-time collections</p>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Fully Settled</p>
                    <p className="text-4xl font-black text-slate-900">{settlementStats.fullyPaid}</p>
                    <p className="text-xs mt-2 text-emerald-500 font-bold">100% balance cleared</p>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Partial Payments</p>
                    <p className="text-4xl font-black text-slate-900">{settlementStats.partiallyPaid}</p>
                    <p className="text-xs mt-2 text-blue-500 font-bold">Ongoing fee installments</p>
                  </div>
                  <div className="rounded-3xl bg-amber-50 border border-amber-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">Awaiting Start</p>
                    <p className="text-4xl font-black text-amber-600">{settlementStats.noPayment}</p>
                    <p className="text-xs mt-2 text-amber-400 font-bold">First payment pending</p>
                  </div>
                </div>

                {/* Record Payment Section */}
                <div className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="font-black text-slate-900 text-lg pr-4 border-r border-slate-100">Record Fee Payment</h3>
                      <p className="text-xs text-slate-400 font-medium tracking-tight">Select a student (Confirmed) to add payment</p>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end min-w-[300px]">
                      <div className="relative group max-w-sm flex-1">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={paySearch}
                          onChange={e => setPaySearch(e.target.value)}
                          className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pl-11 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                      <select
                        value={payBatchFilter}
                        onChange={e => setPayBatchFilter(e.target.value)}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:border-blue-500 transition-all h-[40px]"
                      >
                        <option>All Batches</option>
                        {settingsForm.batchTimes?.map((bt: string) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>

                      {/* Export Balance Fees */}
                      <button
                        onClick={() => {
                          const balanceStudents = rows
                            .filter(r => r.status === 'Confirmed')
                            .map(r => {
                              const course = courses.find(c => c.title === r.courseSelected);
                              const netFee = Math.max(0, (course?.totalFee || 0) - (r.discount_amount || 0));
                              const paid = payments.filter(p => p.registration_id === r.id).reduce((s, p) => s + p.amount_paid, 0);
                              const balance = Math.max(0, netFee - paid);
                              return { ...r, netFee, paid, balance };
                            })
                            .filter(r => r.balance > 0);

                          const header = 'ID,Name,Mobile,Course,Batch,Net Fee,Paid,Balance';
                          const csvRows = balanceStudents.map(r =>
                            `${r.id},"${r.fullName}",${r.mobileNumber},"${r.courseSelected}","${r.preferredBatchTime}",${r.netFee},${r.paid},${r.balance}`
                          );
                          const csv = [header, ...csvRows].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `balance-fees-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-xs font-black text-amber-700 hover:bg-amber-600 hover:text-white transition-all h-[40px] whitespace-nowrap"
                      >
                        <Download size={14} />
                        Export Balance Fees
                      </button>
                    </div>
                  </div>

                   {(() => {
                    const filteredRegs = rows
                      .filter(r => r.status === 'Confirmed')
                      .filter(r => {
                        const course = courses.find(c => c.title === r.courseSelected);
                        const netFee = Math.max(0, (course?.totalFee || 0) - (r.discount_amount || 0));
                        const paid = payments.filter(p => p.registration_id === r.id).reduce((s, p) => s + p.amount_paid, 0);
                        const balance = Math.max(0, netFee - paid);
                        return balance > 0; // Only show students with outstanding balance
                      })
                      .filter(r => {
                        const s = paySearch.toLowerCase();
                        const matchesSearch = r.fullName.toLowerCase().includes(s) || r.mobileNumber.includes(s);
                        const matchesBatch = payBatchFilter === 'All Batches' || r.preferredBatchTime === payBatchFilter;
                        return matchesSearch && matchesBatch;
                      });

                    if (filteredRegs.length === 0) return <div className="p-10 text-center text-emerald-600 font-bold italic"><CheckCircle2 className="mx-auto mb-2" size={28} />All fees are settled! No pending balances.</div>;

                    return (
                      <div className="divide-y divide-slate-50">
                        {filteredRegs.map(reg => {
                          const course = courses.find(c => c.title === reg.courseSelected);
                          const netFee = Math.max(0, (course?.totalFee || 0) - (reg.discount_amount || 0));
                          const paid = payments.filter(p => p.registration_id === reg.id).reduce((s, p) => s + p.amount_paid, 0);
                          const balance = Math.max(0, netFee - paid);
                          return (
                            <div key={reg.id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50/50 transition-colors">
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900 leading-none">{reg.fullName}</p>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">{reg.courseSelected} • {reg.preferredBatchTime}</p>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="text-right flex flex-col items-end">
                                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-0.5">Balance</span>
                                  <span className={`text-base font-black ${balance > 0 ? 'text-blue-600' : 'text-emerald-500'}`}>
                                    {balance > 0 ? `₹${balance}` : '✓ Settled'}
                                  </span>
                                </div>
                                  {balance > 0 ? (
                                    <button
                                      onClick={() => {
                                        setStudentPayment(reg);
                                        setPaymentForm({
                                          payment_type: 'Full',
                                          payment_method: 'Cash',
                                          discount_amount: '',
                                          custom_amount: balance > 0 ? String(balance) : '',
                                          remarks: ''
                                        });
                                      }}
                                      className="rounded-xl bg-blue-50 px-5 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                      Record Payment
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100/50">
                                      <CheckCircle2 size={14} />
                                      Fees Paid
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* All Payment Records Table */}
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <i className="bi bi-card-checklist text-blue-600" />
                      All Payment Records
                    </h3>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative group md:w-80">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Filter name or mobile..."
                          value={payRecSearch}
                          onChange={(e) => setPayRecSearch(e.target.value)}
                          className="w-full rounded-xl border border-slate-100 bg-white py-2 pl-11 pr-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                        />
                      </div>
                      
                      <select
                        value={payRecBatchFilter}
                        onChange={(e) => setPayRecBatchFilter(e.target.value)}
                        className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-black text-slate-600 outline-none transition-all focus:border-blue-500 shadow-sm h-[40px]"
                      >
                        <option>All Batches</option>
                        {settingsForm.batchTimes?.map((bt: string) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>

                      <button
                        onClick={downloadPaymentsCsv}
                        disabled={csvBusy}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        <Download size={18} />
                        {csvBusy ? '...' : 'Export Excellence'}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-[10px]">Student Identity</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-[10px]">Financial Snapshot</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-[10px]">Method</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-[10px]">Transaction Date</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-[10px]">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          const filteredPayments = payments.filter(p => {
                            const reg = rows.find(r => r.id === p.registration_id);
                            if (!reg) return false;
                            
                            const matchesSearch = reg.fullName.toLowerCase().includes(payRecSearch.toLowerCase()) || reg.mobileNumber.includes(payRecSearch);
                            const matchesBatch = payRecBatchFilter === 'All Batches' || reg.preferredBatchTime === payRecBatchFilter;
                            return matchesSearch && matchesBatch;
                          });

                          return filteredPayments.map(p => {
                             const reg = rows.find(r => r.id === p.registration_id);
                             const course = courses.find(c => c.title === reg?.courseSelected);
                             const netFee = Math.max(0, (course?.totalFee || 0) - (reg?.discount_amount || 0));
                             const totalPaid = payments.filter(pm => pm.registration_id === p.registration_id).reduce((s, pm) => s + pm.amount_paid, 0);
                             const balance = Math.max(0, netFee - totalPaid);

                             return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5">
                                   <button 
                                     onClick={() => reg && setViewingStudentHistory(reg)}
                                     className="text-left group/btn transition-transform active:scale-95"
                                   >
                                      <div className="flex flex-col space-y-0.5">
                                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{reg?.fullName || 'Unknown'}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{reg?.mobileNumber} • {reg?.preferredBatchTime}</span>
                                      </div>
                                   </button>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-black text-blue-600">₹{p.amount_paid}</span>
                                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">({p.payment_type})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-600">Paid: ₹{totalPaid}</span>
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${balance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>Bal: ₹{balance}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
                                    p.payment_method === 'Cash' ? 'bg-slate-100 text-slate-600'
                                    : p.payment_method === 'UPI' ? 'bg-violet-100 text-violet-700'
                                    : p.payment_method === 'Bank Transfer' ? 'bg-blue-100 text-blue-700'
                                    : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {p.payment_method}
                                  </span>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">{new Date(p.date).toLocaleDateString('en-IN')}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <p className="text-sm italic text-slate-400 max-w-[200px] truncate" title={p.remarks || ""}>{p.remarks || "No records provided"}</p>
                                </td>
                              </tr>
                             )
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'regs' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 flex-1">
                  <h3 className="text-2xl font-black text-slate-900 pr-4 border-r border-slate-200">Registrations</h3>
                  
                  <div className="relative flex-1 max-w-md">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, mobile, or course..."
                      value={regSearch}
                      onChange={e => setRegSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={regBatchFilter}
                      onChange={e => setRegBatchFilter(e.target.value)}
                      className="appearance-none rounded-xl border border-slate-100 bg-slate-50 pl-4 pr-10 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                    >
                      <option>All Batches</option>
                      {(settingsForm.batchTimes || []).map((b: string) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={downloadCsv}
                  disabled={csvBusy || registrations.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Download size={18} />
                  {csvBusy ? 'Preparing...' : 'Export CSV'}
                </button>
              </div>

              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Student Identity</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Course & Batch</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Fee Status (₹)</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {registrations
                      .filter(reg => {
                        const searchLower = regSearch.toLowerCase()
                        const matchesSearch = reg.fullName.toLowerCase().includes(searchLower) ||
                          reg.mobileNumber.includes(regSearch) ||
                          reg.courseSelected.toLowerCase().includes(searchLower)
                        const matchesBatch = regBatchFilter === 'All Batches' || reg.preferredBatchTime === regBatchFilter
                        return matchesSearch && matchesBatch
                      })
                      .map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-900">{reg.fullName}</div>
                          <div className="text-sm text-slate-500">{reg.email}</div>
                          <div className="mt-2 text-[10px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">ID: #REG-{reg.id.toString().padStart(4, '0')}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-slate-900 leading-tight">{reg.courseSelected}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{reg.preferredBatchTime}</div>
                          <a
                            href={`https://wa.me/${reg.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${reg.fullName}, this is NiKii Computer Academy. We received your registration for ${reg.courseSelected}. How can we help you today?`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
                          >
                            <i className="bi bi-whatsapp" />
                            {reg.mobileNumber}
                          </a>
                        </td>
                        <td className="px-8 py-6">
                          {(() => {
                            const course = courses.find(c => c.title === reg.courseSelected);
                            const baseFee = course?.totalFee || 0;
                            const discount = reg.discount_amount || 0;
                            const netFee = Math.max(0, baseFee - discount);
                            const totalPaid = state.status === 'loaded' 
                              ? state.payments.filter(p => p.registration_id === reg.id).reduce((sum, p) => sum + p.amount_paid, 0)
                              : 0;
                            const balance = Math.max(0, netFee - totalPaid);
                            
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400 font-bold uppercase text-[9px]">Total:</span>
                                  <span className="font-bold text-slate-700">₹{netFee}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400 font-bold uppercase text-[9px]">Paid:</span>
                                  <span className="font-black text-emerald-600">₹{totalPaid}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1 border-t border-slate-50">
                                  <span className="text-slate-400 font-bold uppercase text-[9px]">Bal:</span>
                                  <span className={`font-black ${balance > 0 ? 'text-blue-600' : 'text-slate-300'}`}>₹{balance}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${reg.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                              reg.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              reg.status === 'Completed' ? 'bg-slate-900 text-white' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {reg.status}
                            </span>
                            <div className="flex gap-2">
                            </div>
                            {reg.status === 'Pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setConfirmingStudent(reg);
                                    setConfirmDiscount(reg.discount_amount ? String(reg.discount_amount) : '');
                                  }}
                                  className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <CheckCircle2 size={12} />
                                  Confirm
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Reject and permanently DELETE this registration? This cannot be undone.')) return;
                                    await deleteRegistration(adminKey, reg.id);
                                    load(adminKey);
                                  }}
                                  className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <Trash2 size={12} />
                                  Reject
                                </button>
                              </div>
                            )}
                            {reg.status !== 'Pending' && (
                              <div className="flex gap-2">
                                {reg.status === 'Confirmed' && (
                                  <button
                                    onClick={() => generateAdmissionLetter(reg)}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition"
                                    title="Generate Admission Letter"
                                  >
                                    <FileText size={12} />
                                    Letter
                                  </button>
                                )}
                                {reg.status === 'Confirmed' && (
                                  <button
                                    onClick={() => { if (confirm('Mark this student as COMPLETED? They will be removed from future attendance lists.')) handleUpdateStatus(reg.id, 'Completed') }}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition"
                                    title="Mark Course Completed"
                                  >
                                    <CheckCircle2 size={12} />
                                    Complete
                                  </button>
                                )}
                                  <button
                                    onClick={() => { if (confirm('Reset status to Pending?')) handleUpdateStatus(reg.id, 'Pending') }}
                                    className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                                    title="Reset to Pending"
                                  >
                                    <i className="bi bi-arrow-counterclockwise" />
                                    Reset
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Permanently DELETE ${reg.fullName}? This will remove ALL registration, payment, and attendance data. This action cannot be undone.`)) return;
                                      await deleteRegistration(adminKey, reg.id);
                                      load(adminKey);
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-100 transition flex items-center gap-1"
                                    title="Permanently Delete Registration"
                                  >
                                    <Trash2 size={12} />
                                    Delete
                                  </button>
                                </div>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- CMS TAB --- */}
          {activeTab === 'courses' && (
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">Live Programs</h3>
                  <button
                    onClick={() => { 
                      setIsEditingCourse(null); 
                      setFeaturesTempString('');
                      setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '', totalFee: 0 }) 
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <div className="grid gap-4">
                  {courses.map(course => (
                    <div key={course.id} className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-lg">
                      {/* Course Header Row */}
                      <div className="group flex items-center gap-6 p-6">
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${course.color} text-white shadow-lg overflow-hidden`}>
                          {course.imageUrl ? (
                            <img src={course.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <i className={`bi ${course.icon} text-3xl`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900">{course.title}</h4>
                          <p className="text-sm font-medium text-slate-500">{course.duration} • {course.features.length} Features</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCourseForMaterials(selectedCourseForMaterials?.id === course.id ? null : course)}
                            title="Manage Materials"
                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${selectedCourseForMaterials?.id === course.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => { 
                              setIsEditingCourse(course); 
                              setFeaturesTempString((course.features || []).join(', '));
                              setCourseForm(course);
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Per-Course Materials Panel (expands inline) */}
                      {selectedCourseForMaterials?.id === course.id && state.status === 'loaded' && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <FileText size={12} /> Materials & Syllabus for {course.title}
                          </h5>
                          {/* Existing Materials */}
                          <div className="space-y-2">
                            {state.materials.filter(m => m.course_id === course.id).map(m => (
                              <div key={m.id} className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 border border-slate-100">
                                <FileText size={16} className="text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{m.title}</p>
                                  <p className="text-xs text-slate-400 truncate">{m.description || m.file_url}</p>
                                </div>
                                <a href={m.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-1">
                                  <Download size={14} />
                                </a>
                                <button onClick={() => handleDeleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-1">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {state.materials.filter(m => m.course_id === course.id).length === 0 && (
                              <p className="text-xs text-slate-400 italic text-center py-2">No materials uploaded yet for this course.</p>
                            )}
                          </div>
                          {/* Add New Material Form */}
                          <form onSubmit={handleAddMaterial} className="flex flex-col sm:flex-row gap-3 pt-2">
                            <input
                              required
                              placeholder="Material Title"
                              value={materialForm.title}
                              onChange={e => setMaterialForm({ ...materialForm, title: e.target.value, course_id: course.id })}
                              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <input
                              required
                              placeholder="Download Link (Drive/PDF URL)"
                              value={materialForm.file_url}
                              onChange={e => setMaterialForm({ ...materialForm, file_url: e.target.value, course_id: course.id })}
                              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-700 transition flex items-center gap-2">
                              <Plus size={16} /> Add
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <aside className="lg:col-span-4">
                <div className="sticky top-28 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="mb-6 text-xl font-bold text-slate-900">{isEditingCourse ? 'Edit Program' : 'New Program'}</h3>
                  <form onSubmit={handleCourseSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                      <input
                        value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="Ex: Web Designing"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</label>
                        <input value={courseForm.duration} onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })} className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="6 Months" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1">Total Fees (₹)</label>
                        <input type="number" value={courseForm.totalFee || ''} onChange={e => setCourseForm({ ...courseForm, totalFee: Number(e.target.value) || 0 })} className="w-full rounded-xl bg-blue-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="e.g. 15000" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                      <textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo URL (Optional)</label>
                        <input value={courseForm.imageUrl || ''} onChange={e => setCourseForm({ ...courseForm, imageUrl: e.target.value })} className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="https://logo.png" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                          ðŸ“„ Syllabus URL
                        </label>
                        <input value={courseForm.syllabusUrl || ''} onChange={e => setCourseForm({ ...courseForm, syllabusUrl: e.target.value })} className="w-full rounded-xl bg-emerald-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition outline-none" placeholder="https://drive.google.com/..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Highlights (Comma Separated)</label>
                      <input
                        value={featuresTempString}
                        onChange={e => {
                          const val = e.target.value;
                          setFeaturesTempString(val);
                          setCourseForm({ 
                            ...courseForm, 
                            features: val.split(',').map(s => s.trim()).filter(s => s !== '') 
                          });
                        }}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="Ex: Photoshop, Tally, GST"
                      />
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        id="isPromoted"
                        checked={courseForm.isPromoted}
                        onChange={e => setCourseForm({ ...courseForm, isPromoted: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isPromoted" className="text-sm font-bold text-slate-700">Promote Course (Highlight)</label>
                    </div>

                    {courseForm.isPromoted && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Badge Text (e.g., 50% OFF)</label>
                        <input value={courseForm.badgeText || ''} onChange={e => setCourseForm({ ...courseForm, badgeText: e.target.value })} className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="SUMMER OFFER" />
                      </div>
                    )}
                    <button type="submit" className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98]">
                      {isEditingCourse ? 'Update Program' : 'Launch Program'}
                    </button>
                    {isEditingCourse && (
                      <button type="button" onClick={() => setIsEditingCourse(null)} className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition">Cancel Edition</button>
                    )}
                  </form>
                </div>
              </aside>
            </div>
          )}

          {/* --- ATTENDANCE TAB --- */}
          {activeTab === 'attendance' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Batch Time</label>
                    <select
                      value={selectedBatch}
                      onChange={e => setSelectedBatch(e.target.value)}
                      className="w-full min-w-[240px] rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      {(settingsForm.batchTimes.length > 0 ? settingsForm.batchTimes : [
                        'Batch - I (9.30am - 11.30am)',
                        'Batch - II (11.30am - 1.30pm)',
                        'Batch - III (1.30pm - 3.30pm)',
                        'Batch - IV (3.30pm - 5.30pm)',
                        'Batch - V (5.30pm - 7.30pm)',
                      ]).map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Record Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={e => setAttendanceDate(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition"
                >
                  <Download size={18} />
                  Print Attendance Sheet
                </button>
              </div>

              <div id="attendance-sheet" className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm p-10 print:shadow-none print:border-none print:p-0">
                <div className="mb-10 text-center hidden print:block">
                  <h1 className="text-3xl font-black text-slate-900">NiKii Computer Academy</h1>
                  <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Attendance Sheet • {selectedBatch}</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">Date: {new Date(attendanceDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
                </div>

                <div className="mb-6 flex items-center justify-between print:mb-10">
                  <h3 className="text-xl font-bold text-slate-900">Batch Members ({registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed').length})</h3>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 print:bg-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700">Student Name</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700">Course</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700 w-24">Attendance</th>

                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {registrations
                      .filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed')
                      .map(reg => {
                        return (
                          <tr key={reg.id} className="print:break-inside-avoid">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{reg.fullName}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-black">ID: #REG-{reg.id.toString().padStart(4, '0')}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-slate-700">{reg.courseSelected}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-6 print:hidden">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="radio" 
                                    name={`attendance-${reg.id}`} 
                                    checked={stagedAttendance[reg.id] === 'Present'}
                                    onChange={() => setStagedAttendance(prev => ({ ...prev, [reg.id]: 'Present' }))}
                                    className="h-4 w-4 bg-slate-100 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${stagedAttendance[reg.id] === 'Present' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}>Present</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="radio" 
                                    name={`attendance-${reg.id}`} 
                                    checked={stagedAttendance[reg.id] === 'Absent'}
                                    onChange={() => setStagedAttendance(prev => ({ ...prev, [reg.id]: 'Absent' }))}
                                    className="h-4 w-4 bg-slate-100 border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                  />
                                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${stagedAttendance[reg.id] === 'Absent' ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-600'}`}>Absent</span>
                                </label>
                              </div>
                              <div className="hidden print:block h-6 w-12 border-2 border-slate-200 rounded print:border-slate-400" />
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>

                {/* Batch Action at Bottom */}
                <div className="mt-12 flex justify-center bg-slate-50 border border-slate-100 rounded-[2rem] p-10 print:hidden">
                  <button
                    onClick={handleBatchAttendanceSave}
                    disabled={isSavingAttendance || registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed').length === 0}
                    className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-12 py-5 text-base font-black text-white hover:bg-emerald-700 transition shadow-2xl shadow-emerald-200 disabled:opacity-50 active:scale-95"
                  >
                    {isSavingAttendance ? (
                      <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={24} />
                    )}
                    {isSavingAttendance ? 'Recording Attendance...' : 'Record Batch Attendance'}
                  </button>
                </div>

                {registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed').length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-lg font-medium text-slate-400 italic">No confirmed students found for this batch time.</p>
                  </div>
                )}

                <div className="mt-20 flex justify-between hidden print:flex">
                  <div className="text-center">
                    <div className="h-px w-48 bg-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Instructor Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="h-px w-48 bg-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Office Seal</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CERTIFICATES TAB --- */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Certificate Issuance</h3>
              </div>
              <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-6">Listed below are students with <strong>Confirmed</strong> admission. You can generate professional graduation certificates for them once they complete their courses.</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {registrations
                    .filter(r => r.status === 'Confirmed')
                    .map(reg => (
                      <div key={reg.id} className="group relative overflow-hidden rounded-3xl bg-slate-50 p-6 border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{reg.fullName}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{reg.courseSelected}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500 mb-6">
                          <div className="flex justify-between">
                            <span>Student ID:</span>
                            <span className="font-bold text-slate-700">#REG-{reg.id.toString().padStart(4, '0')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Admission Date:</span>
                            <span className="font-bold text-slate-700">{new Date(reg.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateCertificate(reg)}
                            className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download
                          </button>
                          <button
                            onClick={() => handleNotify(reg.id)}
                            className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            title="Send via Email & WhatsApp"
                          >
                            <Send size={16} />
                            Send
                          </button>
                        </div>
                      </div>
                    ))}
                  {registrations.filter(r => r.status === 'Confirmed').length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-lg font-medium text-slate-400 italic">No confirmed students eligible for certification yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
                    {/* --- SETTINGS TAB --- */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* General Info */}
                <div className="lg:col-span-2 space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">General Information & Academic Year</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Contact Number</label>
                      <input
                        value={settingsForm.contactNumber || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, contactNumber: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white transition outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Academy Address</label>
                      <input
                        value={settingsForm.address || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Available Academic Years</label>
                      <input
                        value={(settingsForm.academicYears || ['2026-2027']).join(', ')}
                        onChange={e => setSettingsForm({ ...settingsForm, academicYears: e.target.value.split(',').map((s: string) => s.trim()) })}
                        placeholder="e.g. 2025-2026, 2026-2027"
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white transition outline-none"
                      />
                      <p className="text-[10px] font-medium text-slate-400">Comma separated list of academic years.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Active Year</label>
                      <select
                        value={settingsForm.currentAcademicYear || '2026-2027'}
                        onChange={e => setSettingsForm({ ...settingsForm, currentAcademicYear: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white transition outline-none"
                      >
                         {(settingsForm.academicYears || ['2026-2027']).map((y: string) => (
                           <option key={y} value={y}>{y}</option>
                         ))}
                      </select>
                      <p className="text-[10px] font-medium text-slate-400">New registrations will be assigned to this year.</p>
                    </div>
                  </div>
                </div>


                <div className="space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <BookOpen className="text-blue-600" size={24} />
                    Batch Timings
                  </h3>
                  <div className="space-y-3">
                    {settingsForm.batchTimes.map((batch: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          value={batch}
                          onChange={e => {
                            const newBatches = [...settingsForm.batchTimes];
                            newBatches[idx] = e.target.value;
                            setSettingsForm({ ...settingsForm, batchTimes: newBatches });
                          }}
                          className="flex-1 rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900"
                        />
                        <button
                          onClick={() => {
                            const newBatches = settingsForm.batchTimes.filter((_: any, i: number) => i !== idx);
                            setSettingsForm({ ...settingsForm, batchTimes: newBatches });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, batchTimes: [...settingsForm.batchTimes, 'New Batch Time'] })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 transition"
                    >
                      <Plus size={16} /> Add Batch Time
                    </button>
                  </div>
                </div>

                <div className="space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <Send className="text-emerald-500" size={24} />
                    Promo Codes
                  </h3>
                  <div className="space-y-4">
                    {settingsForm.promoCodes.map((promo: any, idx: number) => (
                      <div key={idx} className="rounded-2xl bg-slate-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            value={promo.code}
                            onChange={e => {
                              const newPromos = [...settingsForm.promoCodes];
                              newPromos[idx].code = e.target.value.toUpperCase();
                              setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                            }}
                            placeholder="CODE"
                            className="w-24 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-emerald-600 border border-emerald-100"
                          />
                          <button
                            onClick={() => {
                              const newPromos = settingsForm.promoCodes.filter((_: any, i: number) => i !== idx);
                              setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          value={promo.description}
                          onChange={e => {
                            const newPromos = [...settingsForm.promoCodes];
                            newPromos[idx].description = e.target.value;
                            setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                          }}
                          placeholder="Description"
                          className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-medium"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, promoCodes: [...settingsForm.promoCodes, { code: 'NEW50', discount: '50', description: '50% Discount' }] })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition"
                    >
                      <Plus size={16} /> New Promo Code
                    </button>
                  </div>
                </div>

                {/* Administrative Security */}
                <div className="lg:col-span-2 space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <ShieldAlert className="text-amber-500" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Administrative Security</h3>
                      <p className="text-slate-500 text-sm">Update your primary administrative access key</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleUpdateAdminKey} className="grid gap-6 md:grid-cols-3 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Access Key</label>
                      <input 
                        type="password"
                        required
                        value={adminKeyUpdate.current} 
                        onChange={e => setAdminKeyUpdate({ ...adminKeyUpdate, current: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/50 transition outline-none" 
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Access Key</label>
                      <input 
                        type="password"
                        required
                        value={adminKeyUpdate.new} 
                        onChange={e => setAdminKeyUpdate({ ...adminKeyUpdate, new: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/50 transition outline-none" 
                        placeholder="Min 8 chars"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm New Key</label>
                      <input 
                        type="password"
                        required
                        value={adminKeyUpdate.confirm} 
                        onChange={e => setAdminKeyUpdate({ ...adminKeyUpdate, confirm: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/50 transition outline-none" 
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end pt-2">
                      <button 
                        type="submit"
                        className="rounded-xl bg-amber-600 px-8 py-3.5 text-sm font-black text-white hover:bg-amber-700 transition shadow-xl shadow-amber-100"
                      >
                        Update Administrative Key
                      </button>
                    </div>
                  </form>
                  <p className="text-[10px] font-bold text-slate-400 italic mt-2">
                    ⚠️ Note: Updating the access key will immediately override the environment variable and require all active administrators to re-log in.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="rounded-2xl bg-blue-600 px-12 py-5 text-lg font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}



          {/* --- STAFF MANAGEMENT TAB --- */}
          {activeTab === 'staff' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <ShieldCheck className="text-blue-600" size={32} />
                    Staff Accounts
                  </h3>
                  <p className="text-slate-500 font-medium">Manage individual access for academy staff members</p>
                </div>
                <button
                  onClick={() => setIsAddingStaff(!isAddingStaff)}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                >
                  <UserPlus size={18} />
                  {isAddingStaff ? 'Cancel' : 'Register New Staff'}
                </button>
              </div>

              {isAddingStaff && (
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-blue-100 animate-in zoom-in-95 duration-300">
                  <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <UserPlus className="text-blue-600" size={20} />
                    Create New Staff Account
                  </h4>
                  <form onSubmit={handleAddStaff} className="grid gap-6 md:grid-cols-3 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                      <input
                        required
                        value={staffForm.full_name}
                        onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</label>
                      <input
                        required
                        value={staffForm.username}
                        onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="john_staff"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                          required
                          type="text"
                          value={staffForm.password}
                          onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                          className="w-full rounded-xl bg-slate-50 border-none pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <button type="submit" className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-black text-white hover:bg-blue-700 transition">
                        Add Staff Member
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="rounded-[2.5rem] bg-white overflow-hidden shadow-sm border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Username</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(state.status === 'loaded' && state.staff) && state.staff.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                              {s.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900">{s.full_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <code className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">@{s.username}</code>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetStaffPassword(s.id)}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
                              title="Reset Staff Password"
                            >
                              <Key size={12} />
                              Reset Pass
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(s.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Staff Account"
                            >
                              <UserMinus size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {state.status === 'loaded' && state.staff.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center">
                          <p className="text-slate-400 font-medium italic">No individual staff accounts created yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- MODALS --- */}
          {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[3rem] bg-white p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-slate-900 mb-8">Edit Student Record</h2>
            <form onSubmit={handleSaveStudent} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input value={editingStudent.fullName} onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input value={editingStudent.mobileNumber} onChange={e => setEditingStudent({ ...editingStudent, mobileNumber: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Batch Time</label>
                  <select value={editingStudent.preferredBatchTime} onChange={e => setEditingStudent({ ...editingStudent, preferredBatchTime: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold">
                    {settingsForm.batchTimes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Course</label>
                  <select value={editingStudent.courseSelected} onChange={e => setEditingStudent({ ...editingStudent, courseSelected: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold">
                    {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white">Save Changes</button>
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 rounded-2xl bg-slate-100 py-4 font-black text-slate-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM REGISTRATION MODAL --- */}
      {confirmingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Confirm Registration</h2>
                <p className="text-slate-400 text-sm mt-1">
                  For <span className="font-bold text-emerald-600">{confirmingStudent.fullName}</span>
                </p>
              </div>
              <button onClick={() => setConfirmingStudent(null)} className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            {/* Course Fee Summary */}
            {(() => {
              const course = courses.find(c => c.title === confirmingStudent.courseSelected);
              const baseFee = course?.totalFee || 0;
              const disc = Number(confirmDiscount) || 0;
              const netFee = Math.max(0, baseFee - disc);
              return (
                <div className="rounded-3xl bg-slate-50 p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Course</span>
                    <span className="font-bold text-slate-700">{confirmingStudent.courseSelected}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Original Fee</span>
                    <span className="font-black text-slate-900">₹{baseFee}</span>
                  </div>
                  {disc > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-500 font-bold uppercase text-[10px] tracking-widest">Discount</span>
                      <span className="font-black text-orange-500">− ₹{disc}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">Net Fee</span>
                    <span className="text-xl font-black text-emerald-600">₹{netFee}</span>
                  </div>
                </div>
              );
            })()}

            {/* Discount Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
                Discount Amount (₹) – Optional
              </label>
              <input
                type="number"
                min={0}
                placeholder="0 (no discount)"
                value={confirmDiscount}
                onChange={e => setConfirmDiscount(e.target.value)}
                className="w-full rounded-xl bg-orange-50 border-2 border-orange-100 px-4 py-2.5 text-base font-black text-orange-700 focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition outline-none"
              />
              <p className="text-[10px] text-slate-400 font-medium">This discount permanently reduces the course fee for this student.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const disc = Number(confirmDiscount) || 0;
                  await handleUpdateStatus(confirmingStudent.id, 'Confirmed', disc > 0 ? disc : undefined);
                  setConfirmingStudent(null);
                  setConfirmDiscount('');
                }}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Confirm Registration
              </button>
              <button
                onClick={() => { setConfirmingStudent(null); setConfirmDiscount(''); }}
                className="rounded-xl px-6 py-3 bg-slate-100 text-slate-400 font-black hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {studentPayment && (() => {
        const course = courses.find(c => c.title === studentPayment.courseSelected);
        const baseFee = course?.totalFee || 0;
        const discount = studentPayment.discount_amount || 0;
        const netFee = Math.max(0, baseFee - discount);
        
        const previousPayments = state.status === 'loaded' 
          ? state.payments.filter(p => p.registration_id === studentPayment.id)
          : [];
        const totalPaid = previousPayments.reduce((sum, p) => sum + p.amount_paid, 0);
        const balance = Math.max(0, netFee - totalPaid);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Record Fee Payment</h2>
              <p className="text-slate-400 mb-6 text-sm">
                For <span className="font-bold text-blue-600">{studentPayment.fullName}</span> – {studentPayment.courseSelected}
              </p>
              <form onSubmit={handleAddPayment} className="space-y-5">
                {/* Flexible Payment Display */}
                <div className="rounded-3xl bg-slate-50 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Fee</p>
                      <p className="text-xl font-black text-slate-900">₹{netFee}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-600">₹{totalPaid}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Outstanding Balance</p>
                      <p className="text-2xl font-black text-blue-600">₹{balance}</p>
                    </div>
                  </div>
                  
                  {previousPayments.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent Payments</p>
                      <div className="space-y-1.5">
                        {previousPayments.slice(-3).map((p, i) => (
                          <div key={i} className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span className="text-slate-400 font-medium">#{p.id} • {new Date(p.date).toLocaleDateString()}</span>
                            <span className="text-emerald-600">₹{p.amount_paid} ({p.payment_method})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={balance}
                    placeholder={`Max ₹${balance}`}
                    value={paymentForm.custom_amount}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (val > balance) {
                         alert(`Amount cannot exceed the balance of ₹${balance}`);
                         setPaymentForm({ ...paymentForm, custom_amount: balance.toString() });
                      } else {
                         setPaymentForm({ ...paymentForm, custom_amount: e.target.value });
                      }
                    }}
                    className="w-full rounded-xl bg-slate-50 border-2 border-slate-100 px-4 py-2.5 text-base font-black text-slate-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
                  />
                  {Number(paymentForm.custom_amount) > balance && (
                    <p className="text-[10px] font-bold text-red-500">⚠ Amount exceeds outstanding balance!</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    {(['Cash', 'UPI'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentForm(prev => ({ ...prev, payment_method: m }))}
                        className={`rounded-xl py-4 px-1 text-xs font-black text-center border-2 transition ${paymentForm.payment_method === m
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-100 text-slate-400 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-xl mb-1 block">{m === 'Cash' ? '💵' : '📱'}</span>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Remarks (Optional)</label>
                  <input
                    type="text"
                    value={paymentForm.remarks}
                    onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none"
                    placeholder="e.g. Reference number, receipt ID..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={Number(paymentForm.custom_amount) > balance || !paymentForm.custom_amount}
                    className="flex-1 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 transition shadow-xl shadow-blue-200 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                  >
                    ✅ Confirm & Record
                  </button>
                  <button type="button" onClick={() => setStudentPayment(null)} className="rounded-2xl px-6 py-4 bg-slate-100 text-slate-400 font-black hover:bg-slate-200 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
       {viewingStudentHistory && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
           <div className="w-full max-w-2xl rounded-[3rem] bg-white p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
             <div className="flex items-start justify-between mb-8">
               <div>
                 <h2 className="text-2xl font-black text-slate-900">Student Financial History</h2>
                 <p className="text-slate-500 font-medium mt-1">Detailed records for <span className="text-blue-600 font-bold">{viewingStudentHistory.fullName}</span></p>
               </div>
               <button onClick={() => setViewingStudentHistory(null)} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition">
                 <Plus size={20} className="rotate-45" />
               </button>
             </div>

             {(() => {
               const course = courses.find(c => c.title === viewingStudentHistory.courseSelected);
               const baseFee = course?.totalFee || 0;
               const discount = viewingStudentHistory.discount_amount || 0;
               const netFee = Math.max(0, baseFee - discount);
               const studentPayments = state.status === 'loaded' 
                 ? state.payments.filter(p => p.registration_id === viewingStudentHistory.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 : [];
               const totalPaid = studentPayments.reduce((s, p) => s + p.amount_paid, 0);
               const balance = Math.max(0, netFee - totalPaid);

               return (
                 <div className="space-y-8">
                   <div className="grid grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-6">
                     <div className="text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Course Fee</p>
                       <p className="text-lg font-black text-slate-900">₹{netFee}</p>
                     </div>
                     <div className="text-center border-x border-slate-200">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                       <p className="text-lg font-black text-emerald-600">₹{totalPaid}</p>
                     </div>
                     <div className="text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</p>
                       <p className={`text-lg font-black ${balance > 0 ? 'text-blue-600' : 'text-slate-300'}`}>₹{balance}</p>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Transaction History</h3>
                     {studentPayments.length === 0 ? (
                       <p className="text-center py-8 text-slate-400 font-medium italic">No payments recorded yet.</p>
                     ) : (
                       <div className="space-y-3">
                         {studentPayments.map(p => (
                           <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                             <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                                 #{p.id}
                               </div>
                               <div>
                                 <p className="font-bold text-slate-900">₹{p.amount_paid}</p>
                                 <p className="text-[10px] text-slate-400 font-medium">{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {p.payment_method}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-400 italic max-w-[150px] truncate">{p.remarks || '-'}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                   
                   <button 
                     onClick={() => setViewingStudentHistory(null)}
                     className="w-full rounded-2xl bg-slate-900 py-4 font-black text-white hover:bg-slate-800 transition shadow-xl shadow-slate-200"
                   >
                     Done
                   </button>
                 </div>
               );
             })()}
           </div>
         </div>
        )}
      </div>
    );
}
