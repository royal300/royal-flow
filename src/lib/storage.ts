export const API_URL = 'http://localhost:5001/api';

// Types
export interface Staff {
  id: string;
  name: string;
  email: string;
  password?: string;
  department: string;
  position: string;
  avatar?: string;
  createdAt: string;
}

export interface StatusUpdate {
  id: string;
  taskId: string;
  previousStatus: 'Pending' | 'In Progress' | 'Completed';
  newStatus: 'Pending' | 'In Progress' | 'Completed';
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  createdByName: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'Pending' | 'In Progress' | 'Completed';
  deadline: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
  statusHistory: StatusUpdate[];
  files?: string[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late';
  workingHours?: number;
}

export interface DailyReport {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
}

// Helper for API calls
const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  async delete(endpoint: string): Promise<void> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  }
};

// Staff operations
export const staffService = {
  async getAll(): Promise<Staff[]> {
    return api.get<Staff[]>('/staff');
  },

  async getById(id: string): Promise<Staff | undefined> {
    const staff = await this.getAll();
    return staff.find(s => s.id === id);
  },

  async create(staff: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> {
    return api.post<Staff>('/staff', staff);
  },

  async update(id: string, updates: Partial<Staff>): Promise<Staff> {
    return api.put<Staff>(`/staff/${id}`, updates);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/staff/${id}`);
  },
};

// Task operations
export const taskService = {
  async getAll(): Promise<Task[]> {
    return api.get<Task[]>('/tasks');
  },

  async getByStaffId(staffId: string): Promise<Task[]> {
    const tasks = await this.getAll();
    return tasks.filter(t => t.assignedTo === staffId);
  },

  async getById(id: string): Promise<Task | undefined> {
    const tasks = await this.getAll();
    return tasks.find(t => t.id === id);
  },

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'statusHistory'>): Promise<Task> {
    return api.post<Task>('/tasks', task);
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    return api.put<Task>(`/tasks/${id}`, updates);
  },

  async updateStatus(taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed', updatedBy: string, updatedByName: string): Promise<Task | null> {
    const task = await this.getById(taskId);
    if (!task) return null;

    const statusUpdate: StatusUpdate = {
      id: crypto.randomUUID(),
      taskId,
      previousStatus: task.status,
      newStatus,
      updatedBy,
      updatedByName,
      updatedAt: new Date().toISOString(),
    };

    return this.update(taskId, {
      status: newStatus,
      statusHistory: [...(task.statusHistory || []), statusUpdate],
    });
  },

  async addComment(taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>): Promise<TaskComment | null> {
    const task = await this.getById(taskId);
    if (!task) return null;

    const newComment: TaskComment = {
      ...comment,
      id: crypto.randomUUID(),
      taskId,
      createdAt: new Date().toISOString(),
    };

    await this.update(taskId, {
      comments: [...task.comments, newComment]
    });
    return newComment;
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/tasks/${id}`);
  },
};

// Attendance operations
export const attendanceService = {
  async getAll(): Promise<AttendanceRecord[]> {
    return api.get<AttendanceRecord[]>('/attendance');
  },

  async getByStaffId(staffId: string): Promise<AttendanceRecord[]> {
    const records = await this.getAll();
    return records.filter(a => a.staffId === staffId);
  },

  async getByDate(date: string): Promise<AttendanceRecord[]> {
    const records = await this.getAll();
    return records.filter(a => a.date === date);
  },

  async getTodayForStaff(staffId: string): Promise<AttendanceRecord | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getAll();
    return records.find(a => a.staffId === staffId && a.date === today);
  },

  async clockIn(staffId: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const hour = new Date().getHours();
    const status: 'present' | 'late' = hour >= 9 ? 'late' : 'present';

    const record = {
      staffId,
      date: today,
      clockIn: now,
      status,
    };
    return api.post<AttendanceRecord>('/attendance', record);
  },

  async clockOut(recordId: string): Promise<AttendanceRecord | null> {
    const records = await this.getAll();
    const record = records.find(r => r.id === recordId);
    if (!record) return null;

    const now = new Date();
    const clockIn = new Date(record.clockIn!);
    const workingHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    return api.put<AttendanceRecord>(`/attendance/${recordId}`, {
      clockOut: now.toISOString(),
      workingHours: Math.round(workingHours * 100) / 100,
    });
  },
};

// Daily Report operations
export const dailyReportService = {
  async getAll(): Promise<DailyReport[]> {
    return api.get<DailyReport[]>('/daily-reports');
  },

  async getByStaffId(staffId: string): Promise<DailyReport[]> {
    const reports = await this.getAll();
    return reports.filter(r => r.staffId === staffId);
  },

  async create(report: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyReport> {
    return api.post<DailyReport>('/daily-reports', report);
  },

  async update(id: string, content: string): Promise<DailyReport> {
    return api.put<DailyReport>(`/daily-reports/${id}`, { content });
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/daily-reports/${id}`);
  },
};

// Auth operations
export const authService = {
  async login(email: string, password: string, role: 'admin' | 'staff'): Promise<Session | null> {
    try {
      const session = await api.post<Session>('/auth/login', { email, password, role });
      localStorage.setItem('royal300_auth_session', JSON.stringify(session));
      return session;
    } catch (e) {
      console.error('Login failed:', e);
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('royal300_auth_session');
  },

  getSession(): Session | null {
    const data = localStorage.getItem('royal300_auth_session');
    return data ? JSON.parse(data) : null;
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};

export const initializeDefaultAdmin = () => {
  // Deprecated: Admin is handled by backend now.
};
