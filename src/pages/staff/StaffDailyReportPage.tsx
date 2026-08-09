import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Send, Clock, Trash2, Video, Film, Plus, CheckCircle2, List } from 'lucide-react';
import { DailyReport, dailyReportService, settingsService, taskService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StagedEntry {
    id: string;
    clientName: string;
    creativeType: string;
    itemCount?: number;
    remarks?: string;
}

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

const StaffDailyReportPage = () => {
    const { session } = useAuth();
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [todaysReport, setTodaysReport] = useState<DailyReport | null>(null);
    const [reportContent, setReportContent] = useState('');
    const [clients, setClients] = useState<string[]>([]);
    const { toast } = useToast();

    // Creative Report Form State
    const [creativeForm, setCreativeForm] = useState({
        clientName: '',
        creativeType: '',
        itemCount: '',
        remarks: ''
    });

    // Staged entries list for multi-entry submission
    const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (session?.userId) {
            loadReports();
        }
    }, [session?.userId]);

    const loadReports = async () => {
        if (!session?.userId) return;

        try {
            const [allReports, clientsSetting, allTasks] = await Promise.all([
                dailyReportService.getByStaffId(session.userId),
                settingsService.get('accountClients'),
                taskService.getAll()
            ]);

            setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));

            const masterClients = Array.isArray(clientsSetting?.value) ? clientsSetting.value : [];
            const taskClients = Array.from(new Set(allTasks.map(t => t.clientName).filter(Boolean) as string[]));
            setClients(Array.from(new Set([...masterClients, ...taskClients])).sort());

            // Check if general report exists for today
            const today = new Date().toISOString().split('T')[0];
            const todayReport = allReports.find(r => r.date === today && (!r.reportType || r.reportType === 'general'));

            if (todayReport) {
                setTodaysReport(todayReport);
                setReportContent(todayReport.content);
            } else {
                setTodaysReport(null);
                setReportContent('');
            }
        } catch (error) {
            console.error("Failed to load reports", error);
        }
    };

    const handleGeneralSubmit = async () => {
        if (!session || !reportContent.trim()) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            if (todaysReport) {
                await dailyReportService.update(todaysReport.id, reportContent, {
                    reportType: 'general'
                });
                toast({ title: 'Daily work summary updated' });
            } else {
                await dailyReportService.create({
                    staffId: session.userId,
                    staffName: session.name,
                    date: today,
                    content: reportContent,
                    reportType: 'general'
                });
                toast({ title: 'Daily work summary submitted' });
            }

            loadReports();
        } catch (error) {
            toast({ title: 'Failed to submit report', variant: 'destructive' });
        }
    };

    const handleAddStagedEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!creativeForm.clientName || !creativeForm.creativeType) {
            toast({ title: 'Please select Client Name and Type', variant: 'destructive' });
            return;
        }

        const needsItemCount = ['Long Video', 'Creative', 'Reels'].includes(creativeForm.creativeType);
        const countVal = Number(creativeForm.itemCount);
        if (needsItemCount && (!creativeForm.itemCount || isNaN(countVal) || countVal < 1 || countVal > 100)) {
            toast({ title: 'No. of items cannot be greater than 100 or less than 1', variant: 'destructive' });
            return;
        }

        const newEntry: StagedEntry = {
            id: crypto.randomUUID(),
            clientName: creativeForm.clientName,
            creativeType: creativeForm.creativeType,
            itemCount: needsItemCount ? countVal : undefined,
            remarks: creativeForm.remarks.trim()
        };

        setStagedEntries(prev => [...prev, newEntry]);
        setCreativeForm({ clientName: '', creativeType: '', itemCount: '', remarks: '' });
        toast({ title: 'Entry added to list' });
    };

    const handleRemoveStagedEntry = (id: string) => {
        setStagedEntries(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmitAllStaged = async () => {
        if (!session || stagedEntries.length === 0) return;
        setIsSubmitting(true);
        const today = new Date().toISOString().split('T')[0];

        try {
            for (const entry of stagedEntries) {
                const summaryText = `${entry.creativeType} for ${entry.clientName} - ${entry.itemCount !== undefined ? `${entry.itemCount} Item${entry.itemCount > 1 ? 's' : ''}` : 'Shooting'}${entry.remarks ? ` (${entry.remarks})` : ''}`;
                await dailyReportService.create({
                    staffId: session.userId,
                    staffName: session.name,
                    date: today,
                    content: summaryText,
                    reportType: 'creative',
                    clientName: entry.clientName,
                    creativeType: entry.creativeType,
                    itemCount: entry.itemCount
                });
            }
            toast({ title: `${stagedEntries.length} entries submitted to Admin!` });
            setStagedEntries([]);
            await loadReports();
        } catch (error) {
            toast({ title: 'Failed to submit entries', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this report?')) {
            try {
                await dailyReportService.delete(id);
                toast({ title: 'Report deleted' });

                if (todaysReport?.id === id) {
                    setTodaysReport(null);
                    setReportContent('');
                }

                loadReports();
            } catch (error) {
                toast({ title: 'Failed to delete report', variant: 'destructive' });
            }
        }
    };

    const showItemCountField = ['Long Video', 'Creative', 'Reels'].includes(creativeForm.creativeType);

    // Group submitted reports day-wise
    const groupedReports = reports.reduce((acc, report) => {
        const dateKey = report.date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(report);
        return acc;
    }, {} as Record<string, DailyReport[]>);

    const sortedDates = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Daily Reports</h2>
                <p className="text-muted-foreground">Submit your daily work summary and multi-entry creative tasks</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Forms Section */}
                <div className="space-y-4">
                    <Tabs defaultValue="creative" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="creative" className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Daily Report (Multi-Entry)
                            </TabsTrigger>
                            <TabsTrigger value="general" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                General Summary
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="creative" className="space-y-4">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Film className="w-5 h-5 text-primary" />
                                        Add Daily Report Entry
                                    </CardTitle>
                                    <CardDescription>
                                        Add multiple client tasks for today one by one, then submit all together.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddStagedEntry} className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-medium mb-1.5 block">Client Name</Label>
                                            <Autocomplete
                                                value={creativeForm.clientName}
                                                onChange={v => setCreativeForm({ ...creativeForm, clientName: v })}
                                                suggestions={clients}
                                                placeholder="Type or select client name..."
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs font-medium mb-1.5 block">Report Type</Label>
                                            <Autocomplete
                                                value={creativeForm.creativeType}
                                                onChange={v => setCreativeForm({ ...creativeForm, creativeType: v, itemCount: ['Long Video', 'Creative', 'Reels'].includes(v) ? creativeForm.itemCount : '' })}
                                                suggestions={['Long Video', 'Creative', 'Reels', 'Shooting']}
                                                placeholder="Type or select report type..."
                                            />
                                        </div>

                                        {showItemCountField && (
                                            <div className="animate-fade-in">
                                                <Label className="text-xs font-medium mb-1.5 block">
                                                    No. of Items <span className="text-muted-foreground font-normal">(Max 100)</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="Enter total items (e.g., 5)"
                                                    value={creativeForm.itemCount}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                                                            setCreativeForm({ ...creativeForm, itemCount: val });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <Label className="text-xs font-medium mb-1.5 block">Additional Remarks (Optional)</Label>
                                            <Input
                                                placeholder="Any extra details..."
                                                value={creativeForm.remarks}
                                                onChange={e => setCreativeForm({ ...creativeForm, remarks: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button type="submit" variant="secondary" className="gap-1.5">
                                                <Plus className="w-4 h-4" />
                                                Add Entry to List
                                            </Button>
                                        </div>
                                    </form>

                                    {/* Staged List Preview */}
                                    <div className="mt-6 pt-4 border-t border-border space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <List className="w-4 h-4 text-primary" />
                                                Today's Staged Entries ({stagedEntries.length})
                                            </h4>
                                            {stagedEntries.length > 0 && (
                                                <span className="text-xs text-muted-foreground">Ready to submit</span>
                                            )}
                                        </div>

                                        {stagedEntries.length === 0 ? (
                                            <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                                                No entries added to list yet. Fill the form above and click "+ Add Entry to List".
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="overflow-x-auto rounded-lg border border-border">
                                                    <Table>
                                                        <TableHeader className="bg-muted/50">
                                                            <TableRow>
                                                                <TableHead className="text-xs py-2">Client</TableHead>
                                                                <TableHead className="text-xs py-2">Type</TableHead>
                                                                <TableHead className="text-xs py-2 text-center">Count</TableHead>
                                                                <TableHead className="text-xs py-2">Remarks</TableHead>
                                                                <TableHead className="text-xs py-2 text-right">Action</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {stagedEntries.map((entry) => (
                                                                <TableRow key={entry.id} className="text-xs">
                                                                    <TableCell className="font-semibold py-2">{entry.clientName}</TableCell>
                                                                    <TableCell className="py-2">
                                                                        <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                                                                            {entry.creativeType}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-bold py-2">{entry.itemCount ?? '-'}</TableCell>
                                                                    <TableCell className="py-2 text-muted-foreground max-w-[120px] truncate">{entry.remarks || '-'}</TableCell>
                                                                    <TableCell className="text-right py-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                                            onClick={() => handleRemoveStagedEntry(entry.id)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                <Button
                                                    variant="royal"
                                                    className="w-full mt-3 font-semibold gap-2"
                                                    onClick={handleSubmitAllStaged}
                                                    disabled={isSubmitting}
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Submit All {stagedEntries.length} Entries to Admin
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="general" className="space-y-4">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Today's General Summary
                                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                                            {formatDateDDMMYYYY(new Date().toISOString().split('T')[0])}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            What did you work on today?
                                        </label>
                                        <Textarea
                                            placeholder="1. Completed task A&#10;2. Started working on B&#10;3. Fixed bug in C"
                                            value={reportContent}
                                            onChange={(e) => setReportContent(e.target.value)}
                                            rows={10}
                                            className="resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            variant="royal"
                                            onClick={handleGeneralSubmit}
                                            disabled={!reportContent.trim()}
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            {todaysReport ? 'Update Summary' : 'Submit Summary'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Day-Wise Submitted Reports History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Submitted Reports History
                    </h3>

                    <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
                        {sortedDates.length === 0 ? (
                            <GlassCard>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    No reports submitted yet.
                                </CardContent>
                            </GlassCard>
                        ) : (
                            sortedDates.map((dateKey) => {
                                const dayReports = groupedReports[dateKey];
                                const creativeReports = dayReports.filter(r => r.reportType === 'creative');
                                const generalReport = dayReports.find(r => !r.reportType || r.reportType === 'general');

                                return (
                                    <GlassCard key={dateKey} className="overflow-hidden border-yellow-500/20">
                                        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                <span>{formatDateDDMMYYYY(dateKey)}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs bg-background">
                                                {dayReports.length} {dayReports.length === 1 ? 'task' : 'tasks'}
                                            </Badge>
                                        </div>

                                        <CardContent className="p-4 space-y-3">
                                            {/* General Report if any */}
                                            {generalReport && (
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                                                        <span>General Summary</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 w-5 p-0 text-destructive"
                                                            onClick={() => handleDelete(generalReport.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="bg-muted/40 p-3 rounded-md text-xs whitespace-pre-wrap">
                                                        {generalReport.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Creative Reports List for this day */}
                                            {creativeReports.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                                                        Daily Report Entries
                                                    </div>
                                                    <div className="overflow-x-auto rounded-md border border-border">
                                                        <Table>
                                                            <TableHeader className="bg-muted/50">
                                                                <TableRow>
                                                                    <TableHead className="text-[11px] py-1.5">Client</TableHead>
                                                                    <TableHead className="text-[11px] py-1.5">Type</TableHead>
                                                                    <TableHead className="text-[11px] py-1.5 text-center">Count</TableHead>
                                                                    <TableHead className="text-[11px] py-1.5">Remarks / Summary</TableHead>
                                                                    <TableHead className="text-[11px] py-1.5 text-right">Action</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {creativeReports.map((report) => (
                                                                    <TableRow key={report.id} className="text-xs">
                                                                        <TableCell className="font-semibold py-2">{report.clientName || '-'}</TableCell>
                                                                        <TableCell className="py-2">
                                                                            <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                                                                                {report.creativeType || 'Creative'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-bold py-2">{report.itemCount ?? '-'}</TableCell>
                                                                        <TableCell className="py-2 text-muted-foreground max-w-[150px] truncate" title={report.content}>
                                                                            {report.content}
                                                                        </TableCell>
                                                                        <TableCell className="text-right py-2">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                                                onClick={() => handleDelete(report.id)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </GlassCard>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDailyReportPage;

