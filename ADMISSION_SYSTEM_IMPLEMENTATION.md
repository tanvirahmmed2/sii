# Comprehensive Multi-Tenant Admission System Architecture & Implementation

## 1. System Overview & Core Requirements
The Admission System manages end-to-end applicant lifecycle across institutions:
1. **Admission Circulars**: Staff can create, update, and archive admission circulars.
   - **Selection Methods**:
     - `merit`: Requires past academic records (`last_class`, `last_class_grade` / minimum GPA, `last_institution`).
     - `exam`: Requires exam schedule (`exam_date`, `admit_publish_date`, venue, instructions) and subject-wise marks breakdown (`website_admission_exam_subjects`).
     - `manual`: Direct staff decision without mandatory past academic or exam subject constraints.
2. **Applicant Multi-Step Progression with Smart Resume**:
   - Status transitions: `incomplete` -> `unpaid` -> `paid` -> `completed` -> `selected` / `rejected` -> `enrolled`.
   - **Smart Resume**: Check email at step 1. If applicant already exists for the circular:
     - Bypass OTP re-verification.
     - Automatically resume at their current stage (`incomplete` -> Info Form, `unpaid` -> Checkout, `paid` -> Photo/Signature Upload, `completed` -> Summary / Admit Card / Results).
   - If exam-based: on reaching `completed`, auto-generate `exam_roll` as `${currentYear}${seq}` (e.g., `20261`, `20262`, ...).
3. **Public Admit Card & Results**:
   - `(home)/admission/admit-card`: Applicants can query their admit card by application number / exam roll / email. Card becomes downloadable when staff explicitly issues it (`is_admit_card_issued = TRUE`) OR when `CURRENT_TIMESTAMP >= admit_publish_date`.
   - `(home)/admission/results`: Public merit list & individual result lookup. Visible when staff publishes results (`is_result_published = TRUE`) OR when `CURRENT_DATE >= result_date`.
4. **Staff Management & Workstations**:
   - Separate views/filters for applicants by status: `incomplete`, `unpaid`, `paid`, `completed`, `selected`, `rejected`, `enrolled`.
   - Admit card issuance: Single or bulk issuance for all `completed` applicants.
   - Marks Entry: Pre-formatted demo CSV / Excel download prefilled with candidate details and exam subjects, and bulk marks upload.
   - Automated Selection:
     - `exam`: Selects top candidates sorted by total marks obtained up to `capacity`.
     - `merit`: Selects top candidates sorted by previous GPA/marks up to `capacity`.
     - `manual`: Staff selects candidates manually up to `capacity`.
5. **Student Auto-Enrollment on Result Publication**:
   - On result publishing, automatically register selected applicants into:
     - `website_students` (`is_active = FALSE`, generated `registration_no`, `student_unique_id`, `roll_no`).
     - `website_student_info` (`verification_status = 'pending_setup'`, `is_registered = FALSE`, `is_verified = FALSE`).
     - `website_student_addresses` & `website_student_guardians`.
     - `website_student_pictures` & `website_student_signatures`.
   - Applicants can subsequently visit `/auth/student/setup` or `/student/setup`, verify their email, set their password, and access the student portal.

---

## 2. Database Schema & Tables
- `website_admissions`: Circular records, `selection_method` (`exam`, `merit`, `manual`), `is_result_published`, `result_published_at`, `capacity`.
- `website_admission_exams`: Exam date, `admit_publish_date`, venue, instructions.
- `website_admission_exam_subjects`: Subject titles, full marks, duration.
- `website_admission_fees`: Fee amount, currency.
- `website_admission_applicants`: `application_no`, `exam_roll`, `status`, `score`, `merit_position`, `is_admit_card_issued`, `admit_card_issued_at`.
- `website_admission_applicant_info`: Guardian details, address, prior education.
- `website_admission_applicant_images`: Cloudinary photo & signature.
- `website_admission_fee_payments`: Payment status, gateway, transaction ID.
- `website_admission_exam_marks`: Subject-wise marks per applicant.
- `website_admission_results`: Published result status, merit rank, marks.

---

## 3. API Endpoints Map
1. **Public Admission APIs**:
   - `POST /api/[domain]/admissions/lookup`: Check email existence, verification status, and determine resume step.
   - `POST /api/[domain]/admissions/send-otp`: Send 6-digit verification code.
   - `POST /api/[domain]/admissions/verify-otp`: Verify code and create candidate in `incomplete` status.
   - `POST /api/[domain]/admissions/apply`: Save applicant personal, academic, guardian, address data -> transition to `unpaid`.
   - `POST /api/[domain]/admissions/pay`: Process/confirm fee payment -> transition to `paid`.
   - `POST /api/[domain]/admissions/upload`: Cloudinary upload of photo & signature -> transition to `completed` and generate `exam_roll` if exam-based.
   - `GET /api/[domain]/admissions/admit-card`: Fetch candidate admit card if issued or past issue date.
   - `GET /api/[domain]/admissions/results`: Public search & circular results list.
2. **Staff Panel APIs**:
   - `GET, POST, PUT, DELETE /api/[domain]/staff/panel/admissions`: Circular management.
   - `GET /api/[domain]/staff/panel/admissions/applicants`: Filter applicants by `status` (or fetch all for tabbed views), with admit card issue action.
   - `GET /api/[domain]/staff/panel/admissions/exam-marks`: Download prefilled CSV template with subjects.
   - `POST /api/[domain]/staff/panel/admissions/exam-marks`: Upload marks spreadsheet, auto-calculate total score.
   - `POST /api/[domain]/staff/panel/admissions/exam-marks/process`: Auto-select top candidates based on `exam` scores or `merit` GPAs.
   - `POST /api/[domain]/staff/panel/admissions/results/publish`: Publish results and auto-enroll selected students into `website_students` and `website_student_info`.

---

## 4. Frontend Routes & UI Plan
1. **Public `(home)`**:
   - `src/app/[domain]/(home)/admission/page.jsx`: Admission circulars list with status badges, eligibility, and Apply buttons.
   - `src/app/[domain]/(home)/admission/apply/page.jsx`: Smart multi-step applicant wizard (Email Check -> Info Form -> Fee Checkout -> Photo & Signature Upload -> Summary Slip).
   - `src/app/[domain]/(home)/admission/admit-card/page.jsx`: Printable Admit Card search and PDF/print view.
   - `src/app/[domain]/(home)/admission/results/page.jsx`: Results search by roll / application no and circular merit board.
2. **Staff Panel `(staffs)` (Strict adherence to `PANEL_STYLE.md`)**:
   - `admission-circulars/page.jsx`: Create/edit circulars with conditional merit/exam fields.
   - `admission-applicants/page.jsx`: Status tabs (`all`, `incomplete`, `unpaid`, `paid`, `completed`, `selected`, `rejected`, `enrolled`) with Admit Card issuance triggers.
   - `admission-exam-marks-upload/page.jsx`: Demo Excel/CSV download & spreadsheet marks upload.
   - `admission-result/page.jsx`: Merit calculation, selection confirmation, manual selection toggles, and 1-click Result Publication with Auto-Enrollment.
