import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  Users,
  CheckSquare,
  Clock,
  Download,
  Award,
  BarChart3,
  FileText,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import {
  Staff,
  Task,
  AttendanceRecord,
  DailyReport,
  staffService,
  taskService,
  attendanceService,
  dailyReportService
} from '@/lib/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffDate, setSelectedStaffDate] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    avgCompletionRate: 0,
    totalWorkingHours: 0,
  });

  useEffect(() => {
    calculateStats();
    loadReports();
  }, []);

  const calculateStats = async () => {
    try {
      const [staff, tasks, attendance] = await Promise.all([
        staffService.getAll(),
        taskService.getAll(),
        attendanceService.getAll()
      ]);

      setStaffList(staff);

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
    } catch (error) {
      console.error("Failed to calculate stats", error);
    }
  };

  const loadReports = async () => {
    try {
      const reports = await dailyReportService.getAll();
      setDailyReports(reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Failed to load reports", error);
    }
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

  const filteredReports = dailyReports.filter(r => {
    const matchesStaff = selectedStaffDate === 'all' || r.staffId === selectedStaffDate;
    const matchesDate = !selectedDate || r.date === selectedDate;
    return matchesStaff && matchesDate;
  });

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

      <Tabs defaultValue="productivity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Productivity Stats
          </TabsTrigger>
          <TabsTrigger value="daily-reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Daily Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="space-y-6">
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'gradient-gold text-secondary-foreground' :
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
        </TabsContent>

        <TabsContent value="daily-reports" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <Select value={selectedStaffDate} onValueChange={setSelectedStaffDate}>
              <SelectTrigger className="w-[200px]">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              {selectedDate && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredReports.length} report{filteredReports.length !== 1 && 's'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No daily reports found {selectedDate && `for ${new Date(selectedDate).toLocaleDateString()}`}.</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <GlassCard key={report.id} className="h-full hover:-translate-y-1 transition-transform">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold">
                            {report.staffName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium leading-none">{report.staffName}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>

                    <div className="flex-1 bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {report.content}
                    </div>
                  </CardContent>
                </GlassCard>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReportsPage;
