// Centralized API client with structured error handling
// Every API call is wrapped in try-catch for debugging

import type {
  AuthUser, Student, Teacher, Class, Subject, AcademicYear, Institute,
  AttendanceRecord, TimetableEntry, Notice, SyllabusEntry, Exam, ExamResult,
  Assignment, AssignmentSubmission, FeeStructure, FeePayment, TeacherRemark,
  GradingSystem, Notification, Pagination,
} from '@/types';

const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    requestId?: string;
    details?: unknown;
    stack?: string;
  };
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    try {
      return localStorage.getItem('eduyantra_token');
    } catch (error) {
      console.error('[API] Failed to get token from storage:', error);
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem('eduyantra_token', token);
    } catch (error) {
      console.error('[API] Failed to save token:', error);
    }
  }

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem('eduyantra_refresh_token', token);
    } catch (error) {
      console.error('[API] Failed to save refresh token:', error);
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem('eduyantra_token');
      localStorage.removeItem('eduyantra_refresh_token');
    } catch (error) {
      console.error('[API] Failed to clear token:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Try refresh token before clearing
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${this.getToken()}`;
            const retryResponse = await fetch(url, { ...options, headers });
            const retryData: ApiResponse<T> = await retryResponse.json();
            if (retryResponse.ok) return retryData;
          }
          this.clearToken();
        }

        const errorMessage =
          data.error?.message || `Request failed with status ${response.status}`;
        console.error(
          `[API] ${options.method || 'GET'} ${endpoint} → ${response.status}: ${errorMessage}`
        );
        throw new ApiError(errorMessage, response.status, data.error);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error(`[API] Network error on ${endpoint}:`, message);
      throw new ApiError(
        'Unable to connect to server. Please check your connection.',
        0,
        { code: 'NETWORK_ERROR', message }
      );
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('eduyantra_refresh_token');
      if (!refreshToken) return false;
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.data?.token) {
        this.setToken(data.data.token);
        if (data.data.refreshToken) {
          this.setRefreshToken(data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
      );
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  errorData: unknown;

  constructor(message: string, status: number, errorData?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorData = errorData;
  }
}

// Singleton API client
export const api = new ApiClient(API_BASE);

// ═══════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════

export async function loginApi(email: string, password: string, instituteCode?: string) {
  try {
    const response = await api.post<{
      user: AuthUser;
      token: string;
      refreshToken: string;
    }>('/auth/login', { email, password, institute_code: instituteCode });

    if (response.data?.token) {
      api.setToken(response.data.token);
      if (response.data.refreshToken) {
        api.setRefreshToken(response.data.refreshToken);
      }
    }
    return response;
  } catch (error) {
    console.error('[API] Login failed:', error);
    throw error;
  }
}

export async function registerApi(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  institute_name?: string;
  institute_code?: string;
}) {
  try {
    const response = await api.post<{
      user: AuthUser;
      token: string;
      refreshToken: string;
    }>('/auth/register', data);

    if (response.data?.token) {
      api.setToken(response.data.token);
      if (response.data.refreshToken) {
        api.setRefreshToken(response.data.refreshToken);
      }
    }
    return response;
  } catch (error) {
    console.error('[API] Registration failed:', error);
    throw error;
  }
}

export async function getMeApi() {
  try {
    return await api.get<{ user: AuthUser }>('/auth/me');
  } catch (error) {
    console.error('[API] Get profile failed:', error);
    throw error;
  }
}

export async function logoutApi() {
  try {
    await api.post('/auth/logout');
    api.clearToken();
  } catch (error) {
    api.clearToken();
    console.error('[API] Logout failed:', error);
  }
}

export async function changePasswordApi(currentPassword: string, newPassword: string) {
  return api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function forgotPasswordApi(email: string, instituteCode?: string) {
  return api.post('/auth/forgot-password', { email, institute_code: instituteCode });
}

export async function resetPasswordApi(token: string, newPassword: string) {
  return api.post('/auth/reset-password', { token, newPassword });
}

export async function getNotificationPreferences() {
  return api.get('/auth/notification-preferences');
}

export async function updateNotificationPreferences(data: {
  email_notifications?: boolean;
  whatsapp_notifications?: boolean;
  phone?: string;
}) {
  return api.put('/auth/notification-preferences', data);
}

// ═══════════════════════════════════════════
// DASHBOARD API
// ═══════════════════════════════════════════

export async function getDashboardStats() {
  return api.get<{
    stats: {
      totalStudents: number;
      totalTeachers: number;
      totalClasses: number;
      averageAttendance: number;
      totalFeeCollected: number;
      totalFeePending: number;
    };
    attendanceData: { month: string; attendance: number }[];
    performanceData: { subject: string; average: number }[];
    classOverview: { class_name: string; section: string; student_count: number; avg_attendance: number }[];
    recentNotices: Notice[];
  }>('/dashboard/stats');
}

export async function getTeacherDashboard() {
  return api.get('/dashboard/teacher');
}

export async function getStudentDashboard() {
  return api.get('/dashboard/student');
}

export async function getParentDashboard() {
  return api.get('/dashboard/parent');
}

export async function getSuperAdminDashboard() {
  return api.get('/dashboard/super-admin');
}

// ═══════════════════════════════════════════
// STUDENTS API
// ═══════════════════════════════════════════

export async function getStudents(params?: Record<string, string>) {
  return api.get<{
    students: Student[];
    pagination: Pagination;
  }>('/students', params);
}

export async function getStudent(id: string) {
  return api.get<{ student: Student }>(`/students/${id}`);
}

export async function getMyStudentProfile() {
  return api.get('/students/me/profile');
}

export async function createStudent(data: Partial<Student>) {
  return api.post<{ student: Student }>('/students', data);
}

export async function updateStudent(id: string, data: Partial<Student>) {
  return api.put<{ student: Student }>(`/students/${id}`, data);
}

export async function deleteStudent(id: string) {
  return api.delete(`/students/${id}`);
}

// ═══════════════════════════════════════════
// TEACHERS API
// ═══════════════════════════════════════════

export async function getTeachers(params?: Record<string, string>) {
  return api.get<{ teachers: Teacher[] }>('/teachers', params);
}

export async function getTeacher(id: string) {
  return api.get<{ teacher: Teacher }>(`/teachers/${id}`);
}

export async function createTeacher(data: Partial<Teacher>) {
  return api.post<{ teacher: Teacher }>('/teachers', data);
}

export async function updateTeacher(id: string, data: Partial<Teacher>) {
  return api.put<{ teacher: Teacher }>(`/teachers/${id}`, data);
}

export async function deleteTeacher(id: string) {
  return api.delete(`/teachers/${id}`);
}

export async function assignTeacher(teacherId: string, assignments: { class_id: string; subject_id: string }[]) {
  return api.post(`/teachers/${teacherId}/assign`, { assignments });
}

// ═══════════════════════════════════════════
// CLASSES API
// ═══════════════════════════════════════════

export async function getClasses(params?: Record<string, string>) {
  return api.get<{ classes: Class[] }>('/classes', params);
}

export async function createClass(data: Partial<Class>) {
  return api.post<{ class: Class }>('/classes', data);
}

export async function updateClass(id: string, data: Partial<Class>) {
  return api.put<{ class: Class }>(`/classes/${id}`, data);
}

export async function deleteClass(id: string) {
  return api.delete(`/classes/${id}`);
}

// ═══════════════════════════════════════════
// SUBJECTS API
// ═══════════════════════════════════════════

export async function getSubjects(params?: Record<string, string>) {
  return api.get<{ subjects: Subject[] }>('/subjects', params);
}

export async function getSubjectsByClass(classId: string) {
  return api.get<{ subjects: Subject[] }>(`/subjects/by-class/${classId}`);
}

export async function createSubject(data: Partial<Subject>) {
  return api.post<{ subject: Subject }>('/subjects', data);
}

export async function updateSubject(id: string, data: Partial<Subject>) {
  return api.put<{ subject: Subject }>(`/subjects/${id}`, data);
}

export async function deleteSubject(id: string) {
  return api.delete(`/subjects/${id}`);
}

// ═══════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════

export async function getAttendance(params?: Record<string, string>) {
  return api.get<{ records: AttendanceRecord[]; pagination: Pagination }>('/attendance', params);
}

export async function getAttendanceSummary(params?: Record<string, string>) {
  return api.get<{ summary: unknown }>('/attendance/summary', params);
}

export async function getAttendanceMonthly(params?: Record<string, string>) {
  return api.get<{ records: { date: string; status: string; student_id: string; student_name?: string }[] }>('/attendance/monthly', params);
}

export async function getAttendanceSubjectWise(params?: { student_id: string; institute_id?: string }) {
  return api.get<{ subjectWise: { subject_name: string; subject_id: string; total_classes: string; present: string; absent: string; percentage: string }[] }>('/attendance/subject-wise', params);
}

export async function markAttendance(data: {
  records: { student_id: string; status: string; remarks?: string }[];
  class_id: string;
  date: string;
  subject_id?: string;
}) {
  return api.post('/attendance', data);
}

// ═══════════════════════════════════════════
// TIMETABLE API
// ═══════════════════════════════════════════

export async function getTimetable(params?: Record<string, string>) {
  return api.get<{ timetable: TimetableEntry[] }>('/timetable', params);
}

export async function createTimetableEntry(data: Partial<TimetableEntry>) {
  return api.post<{ entry: TimetableEntry }>('/timetable', data);
}

export async function bulkUpsertTimetable(class_id: string, academic_year_id: string, entries: Partial<TimetableEntry>[]) {
  return api.post('/timetable/bulk', { class_id, academic_year_id, entries });
}

export async function updateTimetableEntry(id: string, data: Partial<TimetableEntry>) {
  return api.put<{ entry: TimetableEntry }>(`/timetable/${id}`, data);
}

export async function deleteTimetableEntry(id: string) {
  return api.delete(`/timetable/${id}`);
}

// ═══════════════════════════════════════════
// NOTICES API
// ═══════════════════════════════════════════

export async function getNotices(params?: Record<string, string>) {
  return api.get<{ notices: Notice[]; pagination: Pagination }>('/notices', params);
}

export async function getNotice(id: string) {
  return api.get<{ notice: Notice }>(`/notices/${id}`);
}

export async function createNotice(data: Partial<Notice>) {
  return api.post<{ notice: Notice }>('/notices', data);
}

export async function updateNotice(id: string, data: Partial<Notice>) {
  return api.put<{ notice: Notice }>(`/notices/${id}`, data);
}

export async function deleteNotice(id: string) {
  return api.delete(`/notices/${id}`);
}

// ═══════════════════════════════════════════
// SYLLABUS API
// ═══════════════════════════════════════════

export async function getSyllabus(params?: Record<string, string>) {
  return api.get<{ syllabus: SyllabusEntry[] }>('/syllabus', params);
}

export async function getSyllabusSummary(params?: Record<string, string>) {
  return api.get<{ summary: unknown[] }>('/syllabus/summary', params);
}

export async function createSyllabusEntry(data: Partial<SyllabusEntry>) {
  return api.post<{ entry: SyllabusEntry }>('/syllabus', data);
}

export async function updateSyllabusEntry(id: string, data: Partial<SyllabusEntry>) {
  return api.put<{ entry: SyllabusEntry }>(`/syllabus/${id}`, data);
}

export async function deleteSyllabusEntry(id: string) {
  return api.delete(`/syllabus/${id}`);
}

// ═══════════════════════════════════════════
// EXAMS API
// ═══════════════════════════════════════════

export async function getExams(params?: Record<string, string>) {
  return api.get<{ exams: Exam[]; pagination: Pagination }>('/exams', params);
}

export async function getExam(id: string) {
  return api.get<{ exam: Exam; results: ExamResult[] }>(`/exams/${id}`);
}

export async function createExam(data: Partial<Exam>) {
  return api.post<{ exam: Exam }>('/exams', data);
}

export async function updateExam(id: string, data: Partial<Exam>) {
  return api.put<{ exam: Exam }>(`/exams/${id}`, data);
}

export async function deleteExam(id: string) {
  return api.delete(`/exams/${id}`);
}

export async function enterExamResults(examId: string, results: { student_id: string; marks_obtained: number; is_absent?: boolean }[]) {
  return api.post(`/exams/${examId}/results`, { results });
}

export async function getExamRankList(examId: string) {
  return api.get<{ rankList: ExamResult[] }>(`/exams/${examId}/rank-list`);
}

// ═══════════════════════════════════════════
// ASSIGNMENTS API
// ═══════════════════════════════════════════

export async function getAssignments(params?: Record<string, string>) {
  return api.get<{ assignments: Assignment[]; pagination: Pagination }>('/assignments', params);
}

export async function getAssignment(id: string) {
  return api.get<{ assignment: Assignment; submissions: AssignmentSubmission[] }>(`/assignments/${id}`);
}

export async function getAssignmentDetails(id: string) {
  return api.get<{ assignment: Assignment; submissions: AssignmentSubmission[] }>(`/assignments/${id}`);
}

export async function createAssignment(data: Partial<Assignment>) {
  return api.post<{ assignment: Assignment }>('/assignments', data);
}

export async function updateAssignment(id: string, data: Partial<Assignment>) {
  return api.put<{ assignment: Assignment }>(`/assignments/${id}`, data);
}

export async function deleteAssignment(id: string) {
  return api.delete(`/assignments/${id}`);
}

export async function submitAssignment(assignmentId: string, data: { submission_text?: string; file_url?: string }) {
  return api.post(`/assignments/${assignmentId}/submit`, data);
}

export async function gradeSubmission(assignmentId: string, submissionId: string, data: { marks_obtained: number; teacher_remarks?: string }) {
  return api.put(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, data);
}

// ═══════════════════════════════════════════
// FEES API
// ═══════════════════════════════════════════

export async function getFeeStructures(params?: Record<string, string>) {
  return api.get<{ structures: FeeStructure[] }>('/fees/structures', params);
}

export async function createFeeStructure(data: Partial<FeeStructure>) {
  return api.post<{ structure: FeeStructure }>('/fees/structures', data);
}

export async function updateFeeStructure(id: string, data: Partial<FeeStructure>) {
  return api.put<{ structure: FeeStructure }>(`/fees/structures/${id}`, data);
}

export async function deleteFeeStructure(id: string) {
  return api.delete(`/fees/structures/${id}`);
}

export async function getFeePayments(params?: Record<string, string>) {
  return api.get<{ payments: FeePayment[]; pagination: Pagination }>('/fees/payments', params);
}

export async function recordFeePayment(data: Partial<FeePayment>) {
  return api.post<{ payment: FeePayment }>('/fees/payments', data);
}

export async function getStudentFees(studentId: string) {
  return api.get<{ fees: unknown[]; payments: FeePayment[]; summary: unknown }>(`/fees/student/${studentId}`);
}

export async function getFeeDefaulters(params?: Record<string, string>) {
  return api.get<{ defaulters: unknown[] }>('/fees/defaulters', params);
}

// ═══════════════════════════════════════════
// REMARKS API
// ═══════════════════════════════════════════

export async function getRemarks(params?: Record<string, string>) {
  return api.get<{ remarks: TeacherRemark[] }>('/remarks', params);
}

export async function createRemark(data: Partial<TeacherRemark>) {
  return api.post<{ remark: TeacherRemark }>('/remarks', data);
}

export async function updateRemark(id: string, data: Partial<TeacherRemark>) {
  return api.put<{ remark: TeacherRemark }>(`/remarks/${id}`, data);
}

export async function deleteRemark(id: string) {
  return api.delete(`/remarks/${id}`);
}

// ═══════════════════════════════════════════
// NOTIFICATIONS API
// ═══════════════════════════════════════════

export async function getNotifications(params?: Record<string, string>) {
  return api.get<{ notifications: Notification[]; unread_count: number; pagination: Pagination }>('/notifications', params);
}

export async function markNotificationRead(id: string) {
  return api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return api.put('/notifications/read-all');
}

export async function deleteNotification(id: string) {
  return api.delete(`/notifications/${id}`);
}

// ═══════════════════════════════════════════
// GRADING API
// ═══════════════════════════════════════════

export async function getGradingSystems() {
  return api.get<{ gradingSystems: GradingSystem[] }>('/grading');
}

export async function createGradingSystem(data: Partial<GradingSystem>) {
  return api.post<{ gradingSystem: GradingSystem }>('/grading', data);
}

export async function bulkUpsertGrading(grades: Partial<GradingSystem>[]) {
  return api.post('/grading/bulk', { grades });
}

export async function updateGradingSystem(id: string, data: Partial<GradingSystem>) {
  return api.put<{ gradingSystem: GradingSystem }>(`/grading/${id}`, data);
}

export async function deleteGradingSystem(id: string) {
  return api.delete(`/grading/${id}`);
}

// ═══════════════════════════════════════════
// REPORTS API
// ═══════════════════════════════════════════

export async function getExamResults(params?: Record<string, string>) {
  return api.get<{ results: unknown[] }>('/reports/exam-results', params);
}

export async function getPerformanceTrend(params?: Record<string, string>) {
  return api.get<{ performanceTrend: unknown[] }>('/reports/performance-trend', params);
}

export async function getClassSummary() {
  return api.get<{ summary: unknown[] }>('/reports/class-summary');
}

export async function getReportCard(studentId: string) {
  return api.get<{ student: Student; exams: unknown[]; attendance: unknown; remarks: TeacherRemark[] }>(`/reports/report-card/${studentId}`);
}

export async function getFeeSummary() {
  return api.get<{ summary: unknown }>('/reports/fee-summary');
}

// ═══════════════════════════════════════════
// ACADEMIC YEARS API
// ═══════════════════════════════════════════

export async function getAcademicYears(params?: Record<string, string>) {
  return api.get<{ academicYears: AcademicYear[] }>('/academic-years', params);
}

export async function getCurrentAcademicYear() {
  return api.get<{ academicYear: AcademicYear }>('/academic-years/current');
}

export async function createAcademicYear(data: Partial<AcademicYear>) {
  return api.post<{ academicYear: AcademicYear }>('/academic-years', data);
}

export async function updateAcademicYear(id: string, data: Partial<AcademicYear>) {
  return api.put<{ academicYear: AcademicYear }>(`/academic-years/${id}`, data);
}

export async function archiveAcademicYear(id: string) {
  return api.post(`/academic-years/${id}/archive`);
}

export async function bulkPromoteStudents(id: string, data: { to_academic_year_id: string; promotions: { student_id: string; to_class_id?: string; promotion_type: string }[] }) {
  return api.post(`/academic-years/${id}/promote`, data);
}

// ═══════════════════════════════════════════
// INSTITUTES API (super admin)
// ═══════════════════════════════════════════

export async function getInstitutes(params?: Record<string, string>) {
  return api.get<{ institutes: Institute[]; pagination: Pagination }>('/institutes', params);
}

export async function getInstitute(id: string) {
  return api.get<{ institute: Institute }>(`/institutes/${id}`);
}

export async function createInstitute(data: Partial<Institute>) {
  return api.post<{ institute: Institute }>('/institutes', data);
}

export async function updateInstitute(id: string, data: Partial<Institute>) {
  return api.put<{ institute: Institute }>(`/institutes/${id}`, data);
}

// ═══════════════════════════════════════════
// HOLIDAYS API
// ═══════════════════════════════════════════

export interface Holiday {
  id: string;
  institute_id: string;
  date: string;
  name: string;
  description?: string;
  holiday_type: 'general' | 'national' | 'religious' | 'exam' | 'custom';
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export async function getHolidays(params?: Record<string, string>) {
  return api.get<{ holidays: Holiday[] }>('/holidays', params);
}

export async function createHoliday(data: { date: string; name: string; description?: string; holiday_type?: string }) {
  return api.post<{ holiday: Holiday }>('/holidays', data);
}

export async function updateHoliday(id: string, data: Partial<{ date: string; name: string; description: string; holiday_type: string }>) {
  return api.put<{ holiday: Holiday }>(`/holidays/${id}`, data);
}

export async function deleteHoliday(id: string) {
  return api.delete(`/holidays/${id}`);
}

// ═══════════════════════════════════════════
// ACADEMIC YEARS API
// ═══════════════════════════════════════════

export async function getAcademicYears(params?: Record<string, string>) {
  return api.get<{ academicYears: AcademicYear[] }>('/academic-years', params);
}

export async function getCurrentAcademicYear() {
  return api.get<{ academicYear: AcademicYear }>('/academic-years/current');
}

export async function createAcademicYear(data: Partial<AcademicYear>) {
  return api.post<{ academicYear: AcademicYear }>('/academic-years', data);
}

export async function updateAcademicYear(id: string, data: Partial<AcademicYear>) {
  return api.put<{ academicYear: AcademicYear }>(`/academic-years/${id}`, data);
}

export async function archiveAcademicYear(id: string) {
  return api.post(`/academic-years/${id}/archive`);
}

export async function bulkPromoteStudents(id: string, data: { to_academic_year_id: string; promotions: { student_id: string; to_class_id?: string; promotion_type: string }[] }) {
  return api.post(`/academic-years/${id}/promote`, data);
}

export async function bulkCreateStudents(data: { students: Partial<Student>[] }) {
  return api.post<{ message: string; errors: any[] }>('/students/bulk', data);
}
