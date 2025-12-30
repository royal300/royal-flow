import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { staffService, taskService, attendanceService, Task, Staff } from '@/lib/storage';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    presentToday: 0,
    lateToday: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    const staff = staffService.getAll();
    const tasks = taskService.getAll();
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceService.getByDate(today);

    setStaffList(staff);
    setRecentTasks(tasks.slice(-5).reverse());
    setStats({
      totalStaff: staff.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      pendingTasks: tasks.filter(t => t.status === 'Pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
      presentToday: todayAttendance.filter(a => a.status === 'present').length,
      lateToday: todayAttendance.filter(a => a.status === 'late').length,
    });
  }, []);

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || 'Unassigned';
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'P0': return 'priority_high';
      case 'P1': return 'priority_medium';
      case 'P2': return 'priority_low';
      default: return 'secondary';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending': return 'status_pending';
      case 'In Progress': return 'status_progress';
      case 'Completed': return 'status_completed';
      default: return 'secondary';
    }
  };

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-3xl font-bold mt-1">{stats.totalStaff}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <Link to="/admin/staff" className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline">
              Manage Staff <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-secondary-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-muted-foreground">{stats.completedTasks} completed</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-primary">{stats.inProgressTasks} in progress</span>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold mt-1">{completionRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-3">
              <div 
                className="h-full rounded-full gradient-success transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-3xl font-bold mt-1">{stats.presentToday + stats.lateToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-success">{stats.presentToday} on time</span>
              {stats.lateToday > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-warning">{stats.lateToday} late</span>
                </>
              )}
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Quick Actions & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <GlassCard className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="royal" className="w-full justify-start" asChild>
              <Link to="/admin/staff">
                <Users className="w-4 h-4 mr-2" />
                Add New Staff
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/tasks">
                <CheckSquare className="w-4 h-4 mr-2" />
                Create Task
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/attendance">
                <Clock className="w-4 h-4 mr-2" />
                View Attendance
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/reports">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </GlassCard>

        {/* Task Overview */}
        <GlassCard className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Task Overview</CardTitle>
            <Link to="/admin/tasks" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 text-center">
                <Timer className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{stats.inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="p-3 rounded-lg bg-success/5 text-center">
                <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>

            {/* Recent Tasks List */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Recent Tasks</p>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks yet. Create your first task!
                </p>
              ) : (
                recentTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getStaffName(task.assignedTo)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant={getPriorityVariant(task.priority) as any}>
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusVariant(task.status) as any}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
