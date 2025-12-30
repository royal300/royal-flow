import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { AttendanceRecord, attendanceService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const StaffAttendancePage = () => {
  const { session } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (session?.userId) {
      loadAttendance();
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const loadAttendance = async () => {
    if (session?.userId) {
      try {
        const today = await attendanceService.getTodayForStaff(session.userId);
        setTodayRecord(today || null);
        const history = await attendanceService.getByStaffId(session.userId);
        setAttendanceHistory(history.reverse());
      } catch (error) {
        console.error("Failed to load attendance", error);
      }
    }
  };

  const handleClockIn = async () => {
    if (!session?.userId) return;

    try {
      const record = await attendanceService.clockIn(session.userId);
      setTodayRecord(record);

      if (record.status === 'late') {
        toast({
          title: 'Clocked in (Late)',
          description: 'You clocked in after 9:00 AM',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Clocked in successfully',
          description: 'Have a productive day!',
        });
      }

      loadAttendance();
    } catch (error) {
      toast({ title: 'Failed to clock in', variant: 'destructive' });
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord) return;

    try {
      const updated = await attendanceService.clockOut(todayRecord.id);
      if (updated) {
        setTodayRecord(updated);
        toast({
          title: 'Clocked out successfully',
          description: `Total working hours: ${updated.workingHours?.toFixed(1)}h`,
        });
        loadAttendance();
      }
    } catch (error) {
      toast({ title: 'Failed to clock out', variant: 'destructive' });
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="success">On Time</Badge>;
      case 'late':
        return <Badge variant="warning">Late</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateLiveHours = () => {
    if (!todayRecord?.clockIn || todayRecord.clockOut) return null;
    const start = new Date(todayRecord.clockIn);
    const diff = (currentTime.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  const liveHours = calculateLiveHours();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Current Time */}
      <GlassCard className="text-center py-6">
        <p className="text-4xl font-bold font-mono">
          {currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
        <p className="text-muted-foreground mt-1">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </GlassCard>

      {/* Today's Status */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!todayRecord ? (
            <div className="text-center py-6">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Not clocked in yet</h3>
              <p className="text-muted-foreground mb-6">
                {currentTime.getHours() >= 9 ? (
                  <span className="flex items-center justify-center gap-1 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    You're late! Clock in ASAP.
                  </span>
                ) : (
                  'Clock in to start your workday'
                )}
              </p>
              <Button variant="success" size="lg" onClick={handleClockIn}>
                <LogIn className="w-5 h-5 mr-2" />
                Clock In
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-xl bg-success/10">
                  <LogIn className="w-6 h-6 mx-auto mb-2 text-success" />
                  <p className="text-2xl font-bold">{formatTime(todayRecord.clockIn)}</p>
                  <p className="text-xs text-muted-foreground">Clock In</p>
                </div>
                <div className="p-4 rounded-xl bg-muted">
                  <LogOut className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    {todayRecord.clockOut ? formatTime(todayRecord.clockOut) : '--:--'}
                  </p>
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <span className="font-medium">Working Hours</span>
                </div>
                <div className="flex items-center gap-3">
                  {liveHours && (
                    <span className="text-lg font-bold text-primary animate-pulse-subtle">
                      {liveHours}h
                    </span>
                  )}
                  {todayRecord.workingHours && (
                    <span className="text-lg font-bold">
                      {todayRecord.workingHours.toFixed(1)}h
                    </span>
                  )}
                  {getStatusBadge(todayRecord.status)}
                </div>
              </div>

              {!todayRecord.clockOut && (
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  onClick={handleClockOut}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Clock Out
                </Button>
              )}

              {todayRecord.clockOut && (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Workday completed!</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Attendance History */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No attendance records yet
            </p>
          ) : (
            <div className="space-y-2">
              {attendanceHistory.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{record.date}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      {formatTime(record.clockIn)} - {formatTime(record.clockOut)}
                    </span>
                    <span className="text-muted-foreground">
                      {record.workingHours ? `${record.workingHours.toFixed(1)}h` : '-'}
                    </span>
                    {getStatusBadge(record.status)}
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

export default StaffAttendancePage;
