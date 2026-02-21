// Centralized API client with structured error handling
// Every API call is wrapped in try-catch for debugging

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

    clearToken(): void {
        try {
            localStorage.removeItem('eduyantra_token');
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
                // Handle 401 - auto logout
                if (response.status === 401) {
                    this.clearToken();
                    // Don't redirect here to avoid circular deps, let AuthContext handle it
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

            // Network errors, timeouts, etc.
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

// ── Typed API functions ──

// Auth
export async function loginApi(email: string, password: string, role?: string) {
    try {
        const response = await api.post<{
            user: { id: string; name: string; email: string; role: string; avatar?: string };
            token: string;
        }>('/auth/login', { email, password, role });

        if (response.data?.token) {
            api.setToken(response.data.token);
        }

        return response;
    } catch (error) {
        console.error('[API] Login failed:', error);
        throw error;
    }
}

export async function registerApi(name: string, email: string, password: string, role: string) {
    try {
        const response = await api.post<{
            user: { id: string; name: string; email: string; role: string; avatar?: string };
            token: string;
        }>('/auth/register', { name, email, password, role });

        if (response.data?.token) {
            api.setToken(response.data.token);
        }

        return response;
    } catch (error) {
        console.error('[API] Registration failed:', error);
        throw error;
    }
}

export async function getMeApi() {
    try {
        return await api.get<{
            user: { id: string; name: string; email: string; role: string; avatar?: string };
        }>('/auth/me');
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
        // Always clear token on logout, even if API fails
        api.clearToken();
        console.error('[API] Logout failed:', error);
    }
}

// Dashboard
export async function getDashboardStats() {
    try {
        return await api.get<{
            stats: {
                totalStudents: number;
                totalTeachers: number;
                totalParents: number;
                averageAttendance: number;
                pendingFees: number;
                upcomingEvents: number;
            };
            attendanceData: { month: string; attendance: number }[];
            performanceData: { subject: string; score: number }[];
            recentStudents: unknown[];
            recentNotices: unknown[];
        }>('/dashboard/stats');
    } catch (error) {
        console.error('[API] Dashboard stats failed:', error);
        throw error;
    }
}

// Students
export async function getStudents(params?: {
    search?: string;
    class?: string;
    section?: string;
    page?: string;
    limit?: string;
}) {
    try {
        return await api.get<{
            students: unknown[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        }>('/students', params as Record<string, string>);
    } catch (error) {
        console.error('[API] Get students failed:', error);
        throw error;
    }
}

export async function createStudent(data: unknown) {
    try {
        return await api.post<{ student: unknown }>('/students', data);
    } catch (error) {
        console.error('[API] Create student failed:', error);
        throw error;
    }
}

export async function updateStudent(id: string, data: unknown) {
    try {
        return await api.put<{ student: unknown }>(`/students/${id}`, data);
    } catch (error) {
        console.error('[API] Update student failed:', error);
        throw error;
    }
}

export async function deleteStudent(id: string) {
    try {
        return await api.delete(`/students/${id}`);
    } catch (error) {
        console.error('[API] Delete student failed:', error);
        throw error;
    }
}

// Teachers
export async function getTeachers(params?: { search?: string; subject?: string }) {
    try {
        return await api.get<{ teachers: unknown[] }>('/teachers', params as Record<string, string>);
    } catch (error) {
        console.error('[API] Get teachers failed:', error);
        throw error;
    }
}

// Attendance
export async function getAttendance(params?: Record<string, string>) {
    try {
        return await api.get<{ attendance: unknown[] }>('/attendance', params);
    } catch (error) {
        console.error('[API] Get attendance failed:', error);
        throw error;
    }
}

export async function getAttendanceSummary(params?: Record<string, string>) {
    try {
        return await api.get<{ summary: unknown[] }>('/attendance/summary', params);
    } catch (error) {
        console.error('[API] Get attendance summary failed:', error);
        throw error;
    }
}

export async function markAttendance(records: unknown[]) {
    try {
        return await api.post('/attendance', { records });
    } catch (error) {
        console.error('[API] Mark attendance failed:', error);
        throw error;
    }
}

// Notices
export async function getNotices(params?: Record<string, string>) {
    try {
        return await api.get<{ notices: unknown[] }>('/notices', params);
    } catch (error) {
        console.error('[API] Get notices failed:', error);
        throw error;
    }
}

export async function createNotice(data: unknown) {
    try {
        return await api.post<{ notice: unknown }>('/notices', data);
    } catch (error) {
        console.error('[API] Create notice failed:', error);
        throw error;
    }
}

// Timetable
export async function getTimetable(params?: Record<string, string>) {
    try {
        return await api.get<{ timetable: unknown[] }>('/timetable', params);
    } catch (error) {
        console.error('[API] Get timetable failed:', error);
        throw error;
    }
}

// Syllabus
export async function getSyllabus(params?: Record<string, string>) {
    try {
        return await api.get<{ syllabus: unknown[] }>('/syllabus', params);
    } catch (error) {
        console.error('[API] Get syllabus failed:', error);
        throw error;
    }
}

export async function getSyllabusSummary(params?: Record<string, string>) {
    try {
        return await api.get<{ summary: unknown[] }>('/syllabus/summary', params);
    } catch (error) {
        console.error('[API] Get syllabus summary failed:', error);
        throw error;
    }
}

// Reports
export async function getExamResults(params?: Record<string, string>) {
    try {
        return await api.get<{ results: unknown[] }>('/reports/exam-results', params);
    } catch (error) {
        console.error('[API] Get exam results failed:', error);
        throw error;
    }
}

export async function getPerformanceTrend(params?: Record<string, string>) {
    try {
        return await api.get<{ performanceTrend: unknown[] }>('/reports/performance-trend', params);
    } catch (error) {
        console.error('[API] Get performance trend failed:', error);
        throw error;
    }
}

export async function getClassSummary() {
    try {
        return await api.get<{ summary: unknown[] }>('/reports/class-summary');
    } catch (error) {
        console.error('[API] Get class summary failed:', error);
        throw error;
    }
}
