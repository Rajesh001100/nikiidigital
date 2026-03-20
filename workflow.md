# Project Workflow

NiKii Digital is an end-to-end automation tool for educational management. Here’s the step-by-step workflow:

## 1. Student Registration
- **Action**: Student visits the website home page and clicks "Register Now".
- **Process**: Fills out the comprehensive form (Name, DOB, Mobile, Course, Batch).
- **Automation**: 
  - An email is sent via **Resend**.
  - A WhatsApp welcome message is sent via **UltraMsg**.
  - The record is saved in the database with status `Pending`.

## 2. Admission Management
- **Action**: Admin/Staff logs into the portal using the secure key.
- **Process**: Reviews the `Pending` registration in the "Registrations" tab.
- **Confirmation**: Admin changes the status to `Confirmed`.
- **Automation**: 
  - Official **Provisional Admission Letter** (Email) is triggered.
  - **Admission Confirmed** WhatsApp notification is sent to the student.

## 3. Student Lifecycle
- **Login**: Student logs in using Mobile Number & DOB (Verified against registration records).
- **Dashboard**: Student views their personalized dashboard.
- **Resources**: Student downloads syllabus and materials uploaded by the staff.

## 4. Academic & Financial Operations
- **Attendance**: Staff marks daily attendance. Automated WhatsApp alerts are sent to students who are absent for 2 consecutive days.
- **Payments**: Staff records fee payments. Student sees the updated "Balance" and "Paid" amounts in their dashboard.
- **Reports**: Admin exports monthly registration and revenue reports as CSV for offline accounting.

## 5. Course Completion
- **Certificate**: Admin triggers the **Certificate Notification**.
- **Delivery**: 
  - Student receives their certificate link via WhatsApp/Email.
  - Student views the secure digital certificate at a public-facing URL.
