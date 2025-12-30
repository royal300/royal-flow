// Storage keys - centralized for easy backend migration
export const STORAGE_KEYS = {
  STAFF_LIST: 'royal300_staff_list',
  TASKS: 'royal300_tasks',
  ATTENDANCE: 'royal300_attendance_records',
  SESSION: 'royal300_auth_session',
} as const;

// Types
export interface Staff {
  id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  position: string;
  avatar?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // staff id
  priority: 'P0' | 'P1' | 'P2';
  status: 'Pending' | 'In Progress' | 'Completed';
  deadline: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
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

export interface Session {
  userId: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
}

// Storage service - can be replaced with API calls later
export const storage = {
  get<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};

// Initialize default admin account
export const initializeDefaultAdmin = () => {
  const session = storage.get<Session>(STORAGE_KEYS.SESSION);
  // Only check for first-time setup, not for active session
  const staffList = storage.get<Staff[]>(STORAGE_KEYS.STAFF_LIST);
  
  if (!staffList) {
    storage.set(STORAGE_KEYS.STAFF_LIST, []);
  }
  
  const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS);
  if (!tasks) {
    storage.set(STORAGE_KEYS.TASKS, []);
  }
  
  const attendance = storage.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE);
  if (!attendance) {
    storage.set(STORAGE_KEYS.ATTENDANCE, []);
  }
};

// Staff CRUD operations
export const staffService = {
  getAll(): Staff[] {
    return storage.get<Staff[]>(STORAGE_KEYS.STAFF_LIST) || [];
  },

  getById(id: string): Staff | undefined {
    const staff = this.getAll();
    return staff.find(s => s.id === id);
  },

  create(staff: Omit<Staff, 'id' | 'createdAt'>): Staff {
    const newStaff: Staff = {
      ...staff,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const allStaff = this.getAll();
    storage.set(STORAGE_KEYS.STAFF_LIST, [...allStaff, newStaff]);
    return newStaff;
  },

  update(id: string, updates: Partial<Staff>): Staff | null {
    const allStaff = this.getAll();
    const index = allStaff.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    allStaff[index] = { ...allStaff[index], ...updates };
    storage.set(STORAGE_KEYS.STAFF_LIST, allStaff);
    return allStaff[index];
  },

  delete(id: string): boolean {
    const allStaff = this.getAll();
    const filtered = allStaff.filter(s => s.id !== id);
    if (filtered.length === allStaff.length) return false;
    
    storage.set(STORAGE_KEYS.STAFF_LIST, filtered);
    return true;
  },

  authenticate(email: string, password: string): Staff | null {
    const staff = this.getAll().find(s => s.email === email && s.password === password);
    return staff || null;
  },
};

// Task CRUD operations
export const taskService = {
  getAll(): Task[] {
    return storage.get<Task[]>(STORAGE_KEYS.TASKS) || [];
  },

  getByStaffId(staffId: string): Task[] {
    return this.getAll().filter(t => t.assignedTo === staffId);
  },

  getById(id: string): Task | undefined {
    return this.getAll().find(t => t.id === id);
  },

  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>): Task {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    const allTasks = this.getAll();
    storage.set(STORAGE_KEYS.TASKS, [...allTasks, newTask]);
    return newTask;
  },

  update(id: string, updates: Partial<Task>): Task | null {
    const allTasks = this.getAll();
    const index = allTasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    allTasks[index] = { 
      ...allTasks[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    storage.set(STORAGE_KEYS.TASKS, allTasks);
    return allTasks[index];
  },

  addComment(taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>): TaskComment | null {
    const task = this.getById(taskId);
    if (!task) return null;

    const newComment: TaskComment = {
      ...comment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.update(taskId, { 
      comments: [...task.comments, newComment] 
    });
    return newComment;
  },

  delete(id: string): boolean {
    const allTasks = this.getAll();
    const filtered = allTasks.filter(t => t.id !== id);
    if (filtered.length === allTasks.length) return false;
    
    storage.set(STORAGE_KEYS.TASKS, filtered);
    return true;
  },
};

// Attendance operations
export const attendanceService = {
  getAll(): AttendanceRecord[] {
    return storage.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE) || [];
  },

  getByStaffId(staffId: string): AttendanceRecord[] {
    return this.getAll().filter(a => a.staffId === staffId);
  },

  getByDate(date: string): AttendanceRecord[] {
    return this.getAll().filter(a => a.date === date);
  },

  getTodayForStaff(staffId: string): AttendanceRecord | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll().find(a => a.staffId === staffId && a.date === today);
  },

  clockIn(staffId: string): AttendanceRecord {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const hour = new Date().getHours();
    
    // Consider late if after 9 AM
    const status: 'present' | 'late' = hour >= 9 ? 'late' : 'present';
    
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      staffId,
      date: today,
      clockIn: now,
      status,
    };
    
    const allRecords = this.getAll();
    storage.set(STORAGE_KEYS.ATTENDANCE, [...allRecords, record]);
    return record;
  },

  clockOut(recordId: string): AttendanceRecord | null {
    const allRecords = this.getAll();
    const index = allRecords.findIndex(r => r.id === recordId);
    if (index === -1) return null;
    
    const now = new Date();
    const clockIn = new Date(allRecords[index].clockIn!);
    const workingHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    
    allRecords[index] = {
      ...allRecords[index],
      clockOut: now.toISOString(),
      workingHours: Math.round(workingHours * 100) / 100,
    };
    
    storage.set(STORAGE_KEYS.ATTENDANCE, allRecords);
    return allRecords[index];
  },
};

// Auth operations
export const authService = {
  login(email: string, password: string, role: 'admin' | 'staff'): Session | null {
    if (role === 'admin') {
      // Default admin credentials
      if (email === 'admin@royal300.com' && password === 'admin123') {
        const session: Session = {
          userId: 'admin',
          role: 'admin',
          name: 'Administrator',
          email: 'admin@royal300.com',
        };
        storage.set(STORAGE_KEYS.SESSION, session);
        return session;
      }
      return null;
    }
    
    // Staff login
    const staff = staffService.authenticate(email, password);
    if (!staff) return null;
    
    const session: Session = {
      userId: staff.id,
      role: 'staff',
      name: staff.name,
      email: staff.email,
    };
    storage.set(STORAGE_KEYS.SESSION, session);
    return session;
  },

  logout(): void {
    storage.remove(STORAGE_KEYS.SESSION);
  },

  getSession(): Session | null {
    return storage.get<Session>(STORAGE_KEYS.SESSION);
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
