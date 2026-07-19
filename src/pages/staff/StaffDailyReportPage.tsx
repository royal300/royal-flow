import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Send, Clock, Trash2, Video, Film } from 'lucide-react';
import { DailyReport, dailyReportService, settingsService, taskService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';

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

    const handleCreativeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !creativeForm.clientName || !creativeForm.creativeType) {
            toast({ title: 'Please select Client Name and Type', variant: 'destructive' });
            return;
        }

        const needsItemCount = ['Long Video', 'Creative', 'Reels'].includes(creativeForm.creativeType);
        const countVal = Number(creativeForm.itemCount);
        if (needsItemCount && (!creativeForm.itemCount || isNaN(countVal) || countVal < 1 || countVal > 100)) {
            toast({ title: 'No. of items cannot be greater than 100 or less than 1', variant: 'destructive' });
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const summaryText = `${creativeForm.creativeType} for ${creativeForm.clientName} - ${needsItemCount ? `${countVal} Item${countVal > 1 ? 's' : ''}` : 'Shooting'}${creativeForm.remarks ? ` (${creativeForm.remarks})` : ''}`;

        try {
            await dailyReportService.create({
                staffId: session.userId,
                staffName: session.name,
                date: today,
                content: summaryText,
                reportType: 'creative',
                clientName: creativeForm.clientName,
                creativeType: creativeForm.creativeType,
                itemCount: needsItemCount ? countVal : undefined
            });
            toast({ title: 'Daily report submitted successfully' });
            setCreativeForm({ clientName: '', creativeType: '', itemCount: '', remarks: '' });
            loadReports();
        } catch (error) {
            toast({ title: 'Failed to submit creative report', variant: 'destructive' });
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

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Daily Reports</h2>
                <p className="text-muted-foreground">Submit your daily work summary and creative report entries</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Forms Section */}
                <div className="space-y-4">
                    <Tabs defaultValue="general" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                General Work Summary
                            </TabsTrigger>
                            <TabsTrigger value="creative" className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Daily Report
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Today's General Summary
                                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                                            {new Date().toLocaleDateString()}
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

                        <TabsContent value="creative" className="space-y-4">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Film className="w-5 h-5 text-primary" />
                                        Daily Report Entry
                                    </CardTitle>
                                    <CardDescription>
                                        Record details for videos, reels, creative tasks, or shooting.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreativeSubmit} className="space-y-4">
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
                                            <Button type="submit" variant="royal" disabled={!creativeForm.clientName || !creativeForm.creativeType}>
                                                <Send className="w-4 h-4 mr-2" />
                                                Submit Creative Entry
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </GlassCard>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Previous Reports History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Submitted Reports History ({reports.length})
                    </h3>

                    <div className="space-y-4 max-h-[640px] overflow-y-auto pr-2">
                        {reports.length === 0 ? (
                            <GlassCard>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    No reports submitted yet.
                                </CardContent>
                            </GlassCard>
                        ) : (
                            reports.map((report) => (
                                <GlassCard key={report.id} className="relative group">
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-primary font-medium">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(report.date).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                                {report.reportType === 'creative' ? (
                                                    <Badge className="ml-2 bg-indigo-600 text-white text-[10px]">Daily Report</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="ml-2 text-[10px]">General</Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {report.reportType === 'creative' ? (
                                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 p-3 rounded-lg text-sm space-y-1">
                                                <div className="flex justify-between font-semibold text-indigo-900 dark:text-indigo-200">
                                                    <span>Client: {report.clientName}</span>
                                                    <span>Type: {report.creativeType}</span>
                                                </div>
                                                {report.itemCount !== undefined && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Total Items: <span className="font-semibold text-foreground">{report.itemCount}</span>
                                                    </div>
                                                )}
                                                <div className="text-xs pt-1 text-foreground/90 whitespace-pre-wrap">
                                                    {report.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-muted/30 p-3 rounded-lg text-sm whitespace-pre-wrap">
                                                {report.content}
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(report.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDailyReportPage;
