import { useState, useEffect } from 'react';
import { GlassCard, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Download,
  FileText,
  Calendar,
  X,
  Video,
} from 'lucide-react';
import {
  Staff,
  DailyReport,
  staffService,
  dailyReportService
} from '@/lib/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Autocomplete } from '@/components/ui/autocomplete';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminReportsPage = () => {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [generalStaffFilter, setGeneralStaffFilter] = useState<string>('All');
  const [creativeStaffFilter, setCreativeStaffFilter] = useState<string>('All');
  const [creativeClientFilter, setCreativeClientFilter] = useState<string>('All');
  const [creativeTypeFilter, setCreativeTypeFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<string>('daily-reports');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [staff, reports] = await Promise.all([
        staffService.getAll(),
        dailyReportService.getAll(),
      ]);

      setStaffList(staff);
      setDailyReports(reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const getUniqueValues = (list: any[], key: string) => {
    return Array.from(new Set(list.map(item => item[key]).filter(Boolean)));
  };

  const staffNames = staffList.map(s => s.name);
  const creativeClients = getUniqueValues(dailyReports.filter(r => r.reportType === 'creative'), 'clientName');
  const creativeTypes = ['Long Video', 'Creative', 'Reels', 'Shooting'];

  const filteredGeneralReports = dailyReports.filter(r => {
    if (r.reportType && r.reportType !== 'general') return false;
    const matchesStaff = generalStaffFilter === 'All' || !generalStaffFilter || r.staffName.toLowerCase().includes(generalStaffFilter.toLowerCase());
    const matchesDate = !selectedDate || r.date === selectedDate;
    return matchesStaff && matchesDate;
  });

  const filteredCreativeReports = dailyReports.filter(r => {
    if (r.reportType !== 'creative') return false;
    const matchesStaff = creativeStaffFilter === 'All' || !creativeStaffFilter || r.staffName.toLowerCase().includes(creativeStaffFilter.toLowerCase());
    const matchesClient = creativeClientFilter === 'All' || !creativeClientFilter || (r.clientName && r.clientName.toLowerCase().includes(creativeClientFilter.toLowerCase()));
    const matchesType = creativeTypeFilter === 'All' || !creativeTypeFilter || (r.creativeType && r.creativeType.toLowerCase().includes(creativeTypeFilter.toLowerCase()));
    const matchesDate = !selectedDate || r.date === selectedDate;
    return matchesStaff && matchesClient && matchesType && matchesDate;
  });

  const exportReport = () => {
    if (activeTab === 'creative-reports') {
      const headers = ['Date', 'Staff Name', 'Client Name', 'Creative Type', 'No. of Items', 'Remarks/Summary', 'Submitted At'];
      const rows = filteredCreativeReports.map(r => [
        r.date,
        `"${(r.staffName || '').replace(/"/g, '""')}"`,
        `"${(r.clientName || '').replace(/"/g, '""')}"`,
        `"${(r.creativeType || '').replace(/"/g, '""')}"`,
        r.itemCount !== undefined ? r.itemCount : '',
        `"${(r.content || '').replace(/"/g, '""')}"`,
        new Date(r.createdAt).toLocaleTimeString()
      ]);
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-records-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const headers = ['Date', 'Staff Name', 'Remarks/Summary', 'Submitted At'];
      const rows = filteredGeneralReports.map(r => [
        r.date,
        `"${(r.staffName || '').replace(/"/g, '""')}"`,
        `"${(r.content || '').replace(/"/g, '""')}"`,
        new Date(r.createdAt).toLocaleTimeString()
      ]);
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-work-reports-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Daily Report</h2>
          <p className="text-muted-foreground">Review daily work summaries and daily report submissions</p>
        </div>
        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="daily-reports" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily-reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            General Work Reports
          </TabsTrigger>
          <TabsTrigger value="creative-reports" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Daily Report Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily-reports" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="w-[240px]">
              <Autocomplete
                value={generalStaffFilter}
                onChange={setGeneralStaffFilter}
                suggestions={staffNames}
                placeholder="Filter by Staff (Type 1-2 chars)..."
                emptyValue="All"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 w-[180px] h-9 text-xs"
                />
              </div>
              {selectedDate && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate('')} className="h-9 w-9">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredGeneralReports.length} report{filteredGeneralReports.length !== 1 && 's'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGeneralReports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No general work reports found {selectedDate && `for ${new Date(selectedDate).toLocaleDateString()}`}.</p>
              </div>
            ) : (
              filteredGeneralReports.map((report) => (
                <GlassCard key={report.id} className="h-full hover:-translate-y-1 transition-transform">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold">
                            {report.staffName ? report.staffName.charAt(0) : '?'}
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

        <TabsContent value="creative-reports" className="space-y-6">
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 mb-6">
            <div className="w-[180px]">
              <Autocomplete
                value={creativeStaffFilter}
                onChange={setCreativeStaffFilter}
                suggestions={staffNames}
                placeholder="Staff Name..."
                emptyValue="All"
              />
            </div>
            <div className="w-[180px]">
              <Autocomplete
                value={creativeClientFilter}
                onChange={setCreativeClientFilter}
                suggestions={creativeClients}
                placeholder="Client Name..."
                emptyValue="All"
              />
            </div>
            <div className="w-[160px]">
              <Autocomplete
                value={creativeTypeFilter}
                onChange={setCreativeTypeFilter}
                suggestions={creativeTypes}
                placeholder="Creative Type..."
                emptyValue="All"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 w-[160px] h-9 text-xs"
                />
              </div>
              {selectedDate && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate('')} className="h-9 w-9">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredCreativeReports.length} record{filteredCreativeReports.length !== 1 && 's'}
            </div>
          </div>

          <GlassCard>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Creative Type</TableHead>
                      <TableHead>No. of Items</TableHead>
                      <TableHead>Remarks / Summary</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCreativeReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No Daily Report records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCreativeReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {new Date(report.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold">{report.staffName}</TableCell>
                          <TableCell>{report.clientName || '-'}</TableCell>
                          <TableCell>
                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
                              {report.creativeType || 'Creative'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {report.itemCount !== undefined ? report.itemCount : '-'}
                          </TableCell>
                          <TableCell className="max-w-md whitespace-pre-wrap text-xs">
                            {report.content}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReportsPage;
