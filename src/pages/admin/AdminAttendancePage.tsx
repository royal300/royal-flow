import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Calendar,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { AttendanceRecord, Staff, staffService, attendanceService } from '@/lib/storage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminAttendancePage = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [staffFilter, setStaffFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAttendance(attendanceService.getAll());
    setStaffList(staffService.getAll());
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesDate = !dateFilter || record.date === dateFilter;
    const matchesStaff = staffFilter === 'all' || record.staffId === staffFilter;
    return matchesDate && matchesStaff;
  });

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || 'Unknown';
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

  const todayStats = {
    total: staffList.length,
    present: attendance.filter(a => a.date === dateFilter && a.status === 'present').length,
    late: attendance.filter(a => a.date === dateFilter && a.status === 'late').length,
    absent: staffList.length - attendance.filter(a => a.date === dateFilter).length,
  };

  const exportToCSV = () => {
    const headers = ['Staff Name', 'Date', 'Clock In', 'Clock Out', 'Working Hours', 'Status'];
    const rows = filteredAttendance.map(record => [
      getStaffName(record.staffId),
      record.date,
      formatTime(record.clockIn),
      formatTime(record.clockOut),
      record.workingHours?.toFixed(2) || '-',
      record.status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFilter}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance Records</h2>
          <p className="text-muted-foreground">Track employee attendance and working hours</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{todayStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{todayStats.present}</p>
            <p className="text-xs text-muted-foreground">On Time</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{todayStats.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{todayStats.absent}</p>
            <p className="text-xs text-muted-foreground">Not Clocked In</p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="max-w-[200px]"
          />
        </div>
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance Table */}
      <GlassCard>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {getStaffName(record.staffId)}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(record.clockIn)}
                      </span>
                    </TableCell>
                    <TableCell>{formatTime(record.clockOut)}</TableCell>
                    <TableCell>
                      {record.workingHours ? `${record.workingHours.toFixed(1)}h` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default AdminAttendancePage;
