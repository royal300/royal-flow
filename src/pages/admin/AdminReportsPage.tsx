import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  BarChart3,
  CheckSquare,
  Layers,
  Filter,
  Grid,
  ListFilter,
  Film
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

const formatDateDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getLast3DaysDates = (): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const AdminReportsPage = () => {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [generalStaffFilter, setGeneralStaffFilter] = useState<string>('All');
  const [creativeStaffFilter, setCreativeStaffFilter] = useState<string>('All');
  const [creativeClientFilter, setCreativeClientFilter] = useState<string>('All');
  const [creativeTypeFilter, setCreativeTypeFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<string>('creative-reports');

  // Task 4 state: Default show last 3 days
  const [showFullHistory, setShowFullHistory] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'boxes' | 'table'>('boxes');

  // Task 5 state: Monthly Analytics
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [analyticsStaffFilter, setAnalyticsStaffFilter] = useState<string>('All');

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

  const last3Days = getLast3DaysDates();

  const filteredGeneralReports = dailyReports.filter(r => {
    if (r.reportType && r.reportType !== 'general') return false;
    const matchesStaff = generalStaffFilter === 'All' || !generalStaffFilter || r.staffName.toLowerCase().includes(generalStaffFilter.toLowerCase());
    const matchesDate = !selectedDate || r.date === selectedDate;
    return matchesStaff && matchesDate;
  });

  const filteredCreativeReports = dailyReports.filter(r => {
    if (r.reportType !== 'creative') return false;

    // Default to last 3 days unless full history is checked or specific date filter selected
    if (!showFullHistory && !selectedDate && !last3Days.includes(r.date)) {
      return false;
    }

    const matchesStaff = creativeStaffFilter === 'All' || !creativeStaffFilter || r.staffName.toLowerCase().includes(creativeStaffFilter.toLowerCase());
    const matchesClient = creativeClientFilter === 'All' || !creativeClientFilter || (r.clientName && r.clientName.toLowerCase().includes(creativeClientFilter.toLowerCase()));
    const matchesType = creativeTypeFilter === 'All' || !creativeTypeFilter || (r.creativeType && r.creativeType.toLowerCase().includes(creativeTypeFilter.toLowerCase()));
    const matchesDate = !selectedDate || r.date === selectedDate;
    return matchesStaff && matchesClient && matchesType && matchesDate;
  });

  // Group filtered creative reports date-wise then staff-wise for Task 3
  const groupedByDateAndStaff = filteredCreativeReports.reduce((acc, report) => {
    const dateKey = report.date;
    const staffKey = report.staffName || 'Unknown Staff';
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][staffKey]) acc[dateKey][staffKey] = [];
    acc[dateKey][staffKey].push(report);
    return acc;
  }, {} as Record<string, Record<string, DailyReport[]>>);

  const sortedGroupedDates = Object.keys(groupedByDateAndStaff).sort((a, b) => b.localeCompare(a));

  // Monthly Analytics Calculations (Task 5)
  const monthCreativeReports = dailyReports.filter(r => {
    if (r.reportType !== 'creative') return false;
    const matchesMonth = selectedMonth ? r.date.startsWith(selectedMonth) : true;
    const matchesStaff = analyticsStaffFilter === 'All' || !analyticsStaffFilter || r.staffName.toLowerCase().includes(analyticsStaffFilter.toLowerCase());
    return matchesMonth && matchesStaff;
  });

  const totalCreatives = monthCreativeReports.filter(r => r.creativeType === 'Creative').reduce((sum, r) => sum + (r.itemCount || 1), 0);
  const totalReels = monthCreativeReports.filter(r => r.creativeType === 'Reels').reduce((sum, r) => sum + (r.itemCount || 1), 0);
  const totalLongVideos = monthCreativeReports.filter(r => r.creativeType === 'Long Video').reduce((sum, r) => sum + (r.itemCount || 1), 0);
  const totalShooting = monthCreativeReports.filter(r => r.creativeType === 'Shooting').length;
  const totalAllItems = totalCreatives + totalReels + totalLongVideos + totalShooting;

  // Client distribution statistics for bar chart
  const clientDistribution: Record<string, { totalItems: number; taskCount: number }> = {};
  monthCreativeReports.forEach(r => {
    const client = r.clientName || 'Unspecified Client';
    if (!clientDistribution[client]) {
      clientDistribution[client] = { totalItems: 0, taskCount: 0 };
    }
    clientDistribution[client].totalItems += (r.itemCount || 1);
    clientDistribution[client].taskCount += 1;
  });

  const sortedClientStats = Object.entries(clientDistribution)
    .map(([client, stats]) => ({ client, ...stats }))
    .sort((a, b) => b.totalItems - a.totalItems);

  const maxClientItems = Math.max(...sortedClientStats.map(s => s.totalItems), 1);

  const exportReport = () => {
    if (activeTab === 'creative-reports' || activeTab === 'monthly-analytics') {
      const targetReports = activeTab === 'monthly-analytics' ? monthCreativeReports : filteredCreativeReports;
      const headers = ['Date (DD/MM/YYYY)', 'Staff Name', 'Client Name', 'Creative Type', 'No. of Items', 'Remarks/Summary', 'Submitted At'];
      const rows = targetReports.map(r => [
        formatDateDDMMYYYY(r.date),
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
      const headers = ['Date (DD/MM/YYYY)', 'Staff Name', 'Remarks/Summary', 'Submitted At'];
      const rows = filteredGeneralReports.map(r => [
        formatDateDDMMYYYY(r.date),
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
          <h2 className="text-2xl font-bold">Daily Report Panel</h2>
          <p className="text-muted-foreground">Monitor daily report submissions, day-wise tasks, and monthly staff analytics</p>
        </div>
        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="creative-reports" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="creative-reports" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Daily Report Records
          </TabsTrigger>
          <TabsTrigger value="monthly-analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monthly Analytics
          </TabsTrigger>
          <TabsTrigger value="daily-reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            General Summaries
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: DAILY REPORT RECORDS (Task 3 & 4) --- */}
        <TabsContent value="creative-reports" className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-3">
              {/* Staff Filter */}
              <div className="w-[170px]">
                <Autocomplete
                  value={creativeStaffFilter}
                  onChange={setCreativeStaffFilter}
                  suggestions={staffNames}
                  placeholder="Staff Name..."
                  emptyValue="All"
                />
              </div>

              {/* Client Filter */}
              <div className="w-[170px]">
                <Autocomplete
                  value={creativeClientFilter}
                  onChange={setCreativeClientFilter}
                  suggestions={creativeClients}
                  placeholder="Client Name..."
                  emptyValue="All"
                />
              </div>

              {/* Type Filter */}
              <div className="w-[150px]">
                <Autocomplete
                  value={creativeTypeFilter}
                  onChange={setCreativeTypeFilter}
                  suggestions={creativeTypes}
                  placeholder="Report Type..."
                  emptyValue="All"
                />
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9 w-[150px] h-9 text-xs"
                  />
                </div>
                {selectedDate && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate('')} className="h-9 w-9">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Task 4: Full History Checkbox + View Switcher */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-background px-3 py-2 rounded-lg border border-border text-xs font-semibold select-none hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showFullHistory}
                  onChange={(e) => setShowFullHistory(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
                <span>View Full History</span>
              </label>

              <div className="flex items-center bg-background rounded-lg border border-border p-1">
                <Button
                  variant={viewMode === 'boxes' ? 'royal' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setViewMode('boxes')}
                >
                  <Grid className="w-3.5 h-3.5 mr-1" />
                  Organized Box View
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'royal' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setViewMode('table')}
                >
                  <ListFilter className="w-3.5 h-3.5 mr-1" />
                  Table View
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filter Info Banner */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-2">
              <Badge variant={showFullHistory ? "default" : "secondary"} className="text-[11px]">
                {showFullHistory ? "Full History View" : "Default View: Last 3 Days"}
              </Badge>
              {selectedDate && <Badge variant="outline">Filtered Date: {formatDateDDMMYYYY(selectedDate)}</Badge>}
            </div>
            <span>Found {filteredCreativeReports.length} records</span>
          </div>

          {/* BOX VIEW (Task 3: Date-wise & Staff-wise organized boxes) */}
          {viewMode === 'boxes' ? (
            <div className="space-y-6">
              {sortedGroupedDates.length === 0 ? (
                <GlassCard>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No Daily Report records found.</p>
                    <p className="text-xs mt-1">Try toggling "View Full History" or adjusting filters.</p>
                  </CardContent>
                </GlassCard>
              ) : (
                sortedGroupedDates.map((dateKey) => {
                  const staffGroupMap = groupedByDateAndStaff[dateKey];
                  const staffNamesInDay = Object.keys(staffGroupMap);
                  const dayTotalEntries = staffNamesInDay.reduce((sum, s) => sum + staffGroupMap[s].length, 0);

                  return (
                    <GlassCard key={dateKey} className="border-yellow-500/30 overflow-hidden">
                      {/* Day Header Box */}
                      <div className="bg-yellow-500/15 border-b border-yellow-500/25 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-primary" />
                          <span className="text-base font-bold text-foreground">
                            {formatDateDDMMYYYY(dateKey)}
                          </span>
                          <Badge variant="outline" className="bg-background text-xs">
                            {staffNamesInDay.length} Staff Member{staffNamesInDay.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <Badge className="bg-primary text-black font-semibold text-xs">
                          {dayTotalEntries} Total Entry{dayTotalEntries > 1 ? 'ies' : ''}
                        </Badge>
                      </div>

                      {/* Staff Boxes for this Date */}
                      <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {staffNamesInDay.map((staffName) => {
                            const staffEntries = staffGroupMap[staffName];

                            return (
                              <div
                                key={staffName}
                                className="bg-muted/30 border border-border rounded-xl p-4 space-y-3 hover:border-yellow-500/40 transition-colors"
                              >
                                {/* Staff Header Box */}
                                <div className="flex items-center justify-between pb-2 border-b border-border">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                                      {staffName.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm leading-none">{staffName}</h4>
                                      <span className="text-[11px] text-muted-foreground">
                                        {staffEntries.length} task{staffEntries.length > 1 ? 's' : ''} reported
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Staff Tasks Table / List */}
                                <div className="space-y-2">
                                  {staffEntries.map((item) => (
                                    <div
                                      key={item.id}
                                      className="bg-card border border-border/80 p-3 rounded-lg text-xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between font-bold">
                                        <span className="text-foreground text-sm">{item.clientName}</span>
                                        <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5">
                                          {item.creativeType}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                        <span>
                                          Count: <strong className="text-foreground font-semibold">{item.itemCount ?? 1}</strong>
                                        </span>
                                        <span>
                                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>

                                      {item.content && (
                                        <p className="text-muted-foreground text-[11px] pt-1 border-t border-border/40 whitespace-pre-wrap">
                                          {item.content}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </GlassCard>
                  );
                })
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <GlassCard>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date (DD/MM/YYYY)</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Creative Type</TableHead>
                        <TableHead className="text-center">No. of Items</TableHead>
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
                            <TableCell className="font-bold whitespace-nowrap">
                              {formatDateDDMMYYYY(report.date)}
                            </TableCell>
                            <TableCell className="font-semibold">{report.staffName}</TableCell>
                            <TableCell className="font-medium">{report.clientName || '-'}</TableCell>
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
          )}
        </TabsContent>

        {/* --- TAB 2: MONTHLY ANALYTICS (Task 5) --- */}
        <TabsContent value="monthly-analytics" className="space-y-6">
          {/* Filter Section */}
          <GlassCard>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-primary" />
                Monthly Staff Analytics & Client Distribution
              </CardTitle>
              <CardDescription>
                Select a month and staff member to analyze total creative activities and top client work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="space-y-1.5 w-full sm:w-[200px]">
                  <label className="text-xs font-semibold block text-muted-foreground">Select Month</label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 w-full sm:w-[240px]">
                  <label className="text-xs font-semibold block text-muted-foreground">Staff Member</label>
                  <Autocomplete
                    value={analyticsStaffFilter}
                    onChange={setAnalyticsStaffFilter}
                    suggestions={staffNames}
                    placeholder="All Staff Members..."
                    emptyValue="All"
                  />
                </div>

                <div className="sm:ml-auto text-xs text-muted-foreground pt-4 sm:pt-0">
                  Showing activities for <strong className="text-foreground">{selectedMonth}</strong> ({analyticsStaffFilter})
                </div>
              </div>
            </CardContent>
          </GlassCard>

          {/* Activity Totals Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex items-center gap-4 border-indigo-500/20">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Film className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Creatives Made</p>
                <p className="text-2xl font-bold">{totalCreatives}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-4 border-purple-500/20">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Video className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Reels Created</p>
                <p className="text-2xl font-bold">{totalReels}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-4 border-blue-500/20">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Long Videos</p>
                <p className="text-2xl font-bold">{totalLongVideos}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-4 border-yellow-500/20">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <CameraIcon className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Shooting Sessions</p>
                <p className="text-2xl font-bold">{totalShooting}</p>
              </div>
            </GlassCard>
          </div>

          {/* Bar Chart: Client Work Distribution */}
          <GlassCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Client Work Volume (Bar Chart)
              </CardTitle>
              <CardDescription>
                Shows which client works were done most during {selectedMonth}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedClientStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No creative report activities logged for this month and staff filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedClientStats.map((item, idx) => {
                    const percentage = Math.round((item.totalItems / maxClientItems) * 100);

                    return (
                      <div key={item.client} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-2">
                            <span className="w-5 text-muted-foreground text-[11px]">#{idx + 1}</span>
                            <span className="text-foreground text-sm">{item.client}</span>
                          </span>
                          <span className="text-primary font-bold">
                            {item.totalItems} Items <span className="text-muted-foreground font-normal">({item.taskCount} tasks)</span>
                          </span>
                        </div>
                        <div className="w-full h-4 bg-muted/40 rounded-full overflow-hidden p-0.5 border border-border/50">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* --- TAB 3: GENERAL WORK REPORTS --- */}
        <TabsContent value="daily-reports" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="w-[240px]">
              <Autocomplete
                value={generalStaffFilter}
                onChange={setGeneralStaffFilter}
                suggestions={staffNames}
                placeholder="Filter by Staff..."
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
                <p>No general work reports found {selectedDate && `for ${formatDateDDMMYYYY(selectedDate)}`}.</p>
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
                            {formatDateDDMMYYYY(report.date)}
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

// Helper icon
const CameraIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export default AdminReportsPage;

