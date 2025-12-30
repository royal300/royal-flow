import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, FileText, Send, Clock, Trash2 } from 'lucide-react';
import { DailyReport, dailyReportService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const StaffDailyReportPage = () => {
    const { session } = useAuth();
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [todaysReport, setTodaysReport] = useState<DailyReport | null>(null);
    const [reportContent, setReportContent] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (session?.userId) {
            loadReports();
        }
    }, [session]);

    const loadReports = async () => {
        if (!session?.userId) return;

        try {
            const allReports = await dailyReportService.getByStaffId(session.userId);
            setReports(allReports);

            // Check if report exists for today
            const today = new Date().toISOString().split('T')[0];
            const todayReport = allReports.find(r => r.date === today);

            if (todayReport) {
                setTodaysReport(todayReport);
                setReportContent(todayReport.content);
            }
        } catch (error) {
            console.error("Failed to load reports", error);
        }
    };

    const handleSubmit = async () => {
        if (!session || !reportContent.trim()) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            if (todaysReport) {
                // Update existing
                await dailyReportService.update(todaysReport.id, reportContent);
                toast({ title: 'Daily report updated' });
            } else {
                // Create new
                await dailyReportService.create({
                    staffId: session.userId,
                    staffName: session.name,
                    date: today,
                    content: reportContent,
                });
                toast({ title: 'Daily report submitted' });
            }

            loadReports();
        } catch (error) {
            toast({ title: 'Failed to submit report', variant: 'destructive' });
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

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Daily Reports</h2>
                <p className="text-muted-foreground">Submit your daily work summary</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Report Form */}
                <div className="space-y-4">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Today's Report
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
                                    onClick={handleSubmit}
                                    disabled={!reportContent.trim()}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {todaysReport ? 'Update Report' : 'Submit Report'}
                                </Button>
                            </div>
                        </CardContent>
                    </GlassCard>
                </div>

                {/* Previous Reports History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        History ({reports.length})
                    </h3>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
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
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                Submitted: {new Date(report.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        <div className="bg-muted/30 p-3 rounded-lg text-sm whitespace-pre-wrap">
                                            {report.content}
                                        </div>

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
