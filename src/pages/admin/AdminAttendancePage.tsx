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
  Download,
  Fingerprint,
  Users,
  Settings
} from 'lucide-react';
import { AttendanceRecord, Staff, staffService, attendanceService, settingsService } from '@/lib/storage';
import { FaceRegistrationModal } from '@/components/FaceRegistrationModal';
import FaceManagementModal from '@/components/FaceManagementModal';
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
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [faceManagementModalOpen, setFaceManagementModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [lateThreshold, setLateThreshold] = useState(9); // Default 9 AM

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allAttendance, allStaff, thresholdSetting] = await Promise.all([
        attendanceService.getAll(),
        staffService.getAll(),
        settingsService.get('lateThreshold')
      ]);
      setAttendance(allAttendance);
      setStaffList(allStaff);
      setLateThreshold(thresholdSetting.value || 9);
    } catch (error) {
      console.error("Failed to load attendance data", error);
    }
  };

  const saveLateThreshold = async (newThreshold: number) => {
    try {
      await settingsService.update('lateThreshold', newThreshold);
      setLateThreshold(newThreshold);
    } catch (error) {
      console.error("Failed to save late threshold", error);
    }
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
        <div className="flex gap-2">
          <Button onClick={() => setRegistrationModalOpen(true)}>
            <Fingerprint className="w-4 h-4 mr-2" />
            Register Face
          </Button>
          <Button variant="outline" onClick={() => setFaceManagementModalOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Manage Faces
          </Button>
          <Button variant="outline" onClick={() => setSettingsModalOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Face Registration Modal */}
      <FaceRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        staffList={staffList}
        onSuccess={loadData}
      />

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
                      {record.staffName || getStaffName(record.staffId)}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(record.checkIn || record.clockIn)}
                      </span>
                    </TableCell>
                    <TableCell>{formatTime(record.checkOut || record.clockOut)}</TableCell>
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

      {/* Face Registration Modal */}
      <FaceRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        staffList={staffList}
        onSuccess={loadData}
      />

      {/* Face Management Modal */}
      <FaceManagementModal
        open={faceManagementModalOpen}
        onOpenChange={setFaceManagementModalOpen}
        onFaceDeleted={loadData}
      />

      {/* Settings Dialog */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Attendance Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Late Threshold (Hour of Day)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(parseInt(e.target.value) || 9)}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Staff checking in after {lateThreshold}:00 will be marked as late
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                saveLateThreshold(lateThreshold);
                setSettingsModalOpen(false);
              }}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage;
