// ── Role Types ──
export type UserRole = 'super_admin' | 'institute_admin' | 'class_teacher' | 'subject_teacher' | 'student' | 'parent';

// ── Core Entities ──
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  institute_id?: string;
  is_active?: boolean;
}

export interface Institute {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  modules_enabled: Record<string, boolean>;
  ai_insight_enabled: boolean;
  status: 'active' | 'suspended' | 'archived';
  subscription_plan: string;
  max_students: number;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  institute_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_archived: boolean;
}

export interface Class {
  id: string;
  institute_id: string;
  academic_year_id: string;
  name: string;
  section: string;
  capacity: number;
  class_teacher_id?: string;
  class_teacher_name?: string;
  student_count?: number;
}

export interface Subject {
  id: string;
  institute_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

// ── Student & Teacher ──
export interface Student {
  id: string;
  user_id?: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  email: string;
  roll_number: string;
  admission_date?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  parent_id?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  blood_group?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  // Joined fields
  class_name?: string;
  section?: string;
}

export interface Teacher {
  id: string;
  user_id?: string;
  institute_id: string;
  name: string;
  email: string;
  phone?: string;
  subject_specialization?: string;
  qualification?: string;
  experience_years?: number;
  avatar?: string;
  status: 'active' | 'inactive' | 'on_leave';
  // Joined fields
  assignments?: TeacherAssignment[];
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  is_class_teacher: boolean;
  class_name?: string;
  section?: string;
  subject_name?: string;
}

// ── Attendance ──
export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  subject_id?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string;
  remarks?: string;
  student_name?: string;
  roll_number?: string;
}

// ── Timetable ──
export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id?: string;
  teacher_id?: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string;
  subject_name?: string;
  teacher_name?: string;
  class_name?: string;
  section?: string;
}

// ── Notices ──
export interface Notice {
  id: string;
  institute_id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_roles?: string[];
  target_class_ids?: string[];
  attachment_url?: string;
  is_published: boolean;
  created_by?: string;
  created_by_name?: string;
  expires_at?: string;
  created_at: string;
}

// ── Syllabus ──
export interface SyllabusEntry {
  id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  unit_name: string;
  topic_name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completion_percentage: number;
  target_date?: string;
  completed_date?: string;
  class_name?: string;
  section?: string;
  subject_name?: string;
}

// ── Exams & Results ──
export interface Exam {
  id: string;
  institute_id: string;
  academic_year_id: string;
  name: string;
  exam_type: 'unit_test' | 'mid_term' | 'final' | 'assignment' | 'practical' | 'other';
  class_id?: string;
  subject_id?: string;
  total_marks: number;
  passing_marks: number;
  weightage: number;
  exam_date?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_by?: string;
  class_name?: string;
  section?: string;
  subject_name?: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained?: number;
  grade?: string;
  rank?: number;
  remarks?: string;
  is_absent: boolean;
  student_name?: string;
  roll_number?: string;
}

// ── Assignments ──
export interface Assignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  academic_year_id: string;
  title: string;
  description?: string;
  instructions?: string;
  due_date: string;
  total_marks: number;
  attachment_url?: string;
  status: 'draft' | 'published' | 'closed';
  allow_late_submission: boolean;
  class_name?: string;
  section?: string;
  subject_name?: string;
  teacher_name?: string;
  submission_count?: number;
  total_students?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text?: string;
  file_url?: string;
  submitted_at: string;
  is_late: boolean;
  marks_obtained?: number;
  teacher_remarks?: string;
  graded_by?: string;
  graded_at?: string;
  student_name?: string;
  roll_number?: string;
}

// ── Fees ──
export interface FeeStructure {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id?: string;
  name: string;
  amount: number;
  fee_type: 'tuition' | 'exam' | 'lab' | 'library' | 'transport' | 'hostel' | 'other';
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  due_day: number;
  is_active: boolean;
}

export interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  academic_year_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: 'cash' | 'cheque' | 'bank_transfer' | 'other';
  receipt_number?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  remarks?: string;
  student_name?: string;
  class_name?: string;
}

// ── Teacher Remarks ──
export interface TeacherRemark {
  id: string;
  student_id: string;
  teacher_id: string;
  subject_id?: string;
  remark_type: 'general' | 'subject' | 'term' | 'behavioral' | 'appreciation';
  content: string;
  is_visible_to_parent: boolean;
  academic_year_id: string;
  student_name?: string;
  teacher_name?: string;
  subject_name?: string;
  created_at: string;
}

// ── Grading Systems ──
export interface GradingSystem {
  id: string;
  institute_id: string;
  name: string;
  min_percentage: number;
  max_percentage: number;
  grade: string;
  grade_point?: number;
  is_default: boolean;
}

// ── Notifications ──
export interface Notification {
  id: string;
  institute_id?: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

// ── Dashboard Stats ──
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  averageAttendance: number;
  totalFeeCollected: number;
  totalFeePending: number;
  attendanceData: { month: string; attendance: number }[];
  performanceData: { subject: string; average: number }[];
  classOverview: { class_name: string; section: string; student_count: number; avg_attendance: number }[];
  recentNotices: Notice[];
}

// ── Pagination ──
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Auth Context Types ──
export interface AuthUser extends User {
  institute?: {
    id: string;
    name: string;
    code: string;
    modules_enabled: Record<string, boolean>;
    ai_insight_enabled: boolean;
  };
}
