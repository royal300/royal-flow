import { Button } from '@/components/ui/button';
import { GlassCard, CardContent } from '@/components/ui/card';
import { ExternalLink, Calendar } from 'lucide-react';

const AdminAttendancePage = () => {
  return (
    <div className="space-y-6 animate-fade-up min-h-[70vh] flex flex-col items-center justify-center">
      <GlassCard className="max-w-md w-full text-center p-8">
        <CardContent className="space-y-6 flex flex-col items-center p-0">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <Calendar className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Attendance Panel</h2>
            <p className="text-muted-foreground text-sm">
              Click below to open and manage employee attendance records on the central system.
            </p>
          </div>
          <a
            href="https://attendance.royal300.com/admin/attendance"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button size="lg" className="w-full gap-2 text-base font-medium">
              Attendance Panel
              <ExternalLink className="w-5 h-5" />
            </Button>
          </a>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default AdminAttendancePage;
