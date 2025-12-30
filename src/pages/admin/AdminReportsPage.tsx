import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  Users,
  CheckSquare,
  Clock,
  Download,
  Award,
  BarChart3
} from 'lucide-react';
import { Staff, Task, AttendanceRecord, staffService, taskService, attendanceService } from '@/lib/storage';

interface StaffStats {
  staff: Staff;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgWorkingHours: number;
  attendanceRate: number;
  productivityScore: number;
}

const AdminReportsPage = () => {
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    avgCompletionRate: 0,
    totalWorkingHours: 0,
  });

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = () => {
    const staff = staffService.getAll();
    const tasks = taskService.getAll();
    const attendance = attendanceService.getAll();

    const stats: StaffStats[] = staff.map((s) => {
      const staffTasks = tasks.filter(t => t.assignedTo === s.id);
      const completedTasks = staffTasks.filter(t => t.status === 'Completed').length;
      const staffAttendance = attendance.filter(a => a.staffId === s.id);
      
      const avgWorkingHours = staffAttendance.length > 0
        ? staffAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0) / staffAttendance.length
        : 0;
      
      const uniqueDays = new Set(staffAttendance.map(a => a.date)).size;
      const totalPossibleDays = 30; // Approximate month
      const attendanceRate = Math.min(100, (uniqueDays / totalPossibleDays) * 100);
      
      const completionRate = staffTasks.length > 0 ? (completedTasks / staffTasks.length) * 100 : 0;
      
      // Productivity score: weighted combination of completion rate, attendance, and work hours
      const productivityScore = Math.round(
        (completionRate * 0.5) + (attendanceRate * 0.3) + (Math.min(avgWorkingHours / 8, 1) * 20)
      );

      return {
        staff: s,
        totalTasks: staffTasks.length,
        completedTasks,
        completionRate: Math.round(completionRate),
        avgWorkingHours: Math.round(avgWorkingHours * 10) / 10,
        attendanceRate: Math.round(attendanceRate),
        productivityScore: Math.min(100, productivityScore),
      };
    });

    setStaffStats(stats.sort((a, b) => b.productivityScore - a.productivityScore));

    setOverallStats({
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      avgCompletionRate: stats.length > 0 
        ? Math.round(stats.reduce((sum, s) => sum + s.completionRate, 0) / stats.length)
        : 0,
      totalWorkingHours: Math.round(attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0)),
    });
  };

  const exportReport = () => {
    const headers = ['Staff Name', 'Department', 'Total Tasks', 'Completed', 'Completion Rate', 'Avg Hours', 'Productivity Score'];
    const rows = staffStats.map(s => [
      s.staff.name,
      s.staff.department,
      s.totalTasks,
      s.completedTasks,
      `${s.completionRate}%`,
      `${s.avgWorkingHours}h`,
      s.productivityScore,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-primary';
    if (score >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">View productivity scores and performance metrics</p>
        </div>
        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold mt-1">{overallStats.totalTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Tasks</p>
                <p className="text-3xl font-bold mt-1">{overallStats.completedTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Rate</p>
                <p className="text-3xl font-bold mt-1">{overallStats.avgCompletionRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Work Hours</p>
                <p className="text-3xl font-bold mt-1">{overallStats.totalWorkingHours}h</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Staff Performance */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            Staff Performance Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members to display. Add staff to see performance reports.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffStats.map((stat, index) => (
                <div 
                  key={stat.staff.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'gradient-gold text-secondary-foreground' :
                    index === 1 ? 'bg-muted text-foreground' :
                    index === 2 ? 'bg-warning/20 text-warning' :
                    'bg-muted/50 text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <span className="text-success font-bold">
                        {stat.staff.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{stat.staff.name}</p>
                      <p className="text-xs text-muted-foreground">{stat.staff.department}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{stat.completedTasks}/{stat.totalTasks}</p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{stat.completionRate}%</p>
                      <p className="text-xs text-muted-foreground">Completion</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{stat.avgWorkingHours}h</p>
                      <p className="text-xs text-muted-foreground">Avg Hours</p>
                    </div>
                  </div>

                  {/* Productivity Score */}
                  <div className="flex items-center gap-3">
                    <div className="hidden md:block w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getScoreBg(stat.productivityScore)} transition-all duration-500`}
                        style={{ width: `${stat.productivityScore}%` }}
                      />
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(stat.productivityScore)}`}>
                      {stat.productivityScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default AdminReportsPage;
