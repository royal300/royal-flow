
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Calendar
} from 'lucide-react';
import { staffService, Staff } from '@/lib/storage';

const StaffProfilePage = () => {
  const { session } = useAuth();
  const [staff, setStaff] = useState<Staff | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
      if (session?.userId) {
        try {
          const data = await staffService.getById(session.userId);
          setStaff(data);
        } catch (error) {
          console.error("Failed to load profile", error);
        }
      }
      setLoading(false);
    };
    loadStaff();
  }, [session?.userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Profile Header */}
      <GlassCard className="text-center py-8">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-success font-bold text-4xl">
            {staff.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{staff.name}</h1>
        <p className="text-muted-foreground">{staff.email}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant="secondary">{staff.department}</Badge>
          <Badge variant="outline">{staff.position}</Badge>
        </div>
      </GlassCard>

      {/* Profile Details */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{staff.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{staff.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{staff.position}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="font-medium">
                {new Date(staff.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default StaffProfilePage;
