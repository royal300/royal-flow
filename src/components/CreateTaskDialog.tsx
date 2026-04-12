import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Share2,
  Users,
  X
} from 'lucide-react';
import { Staff, staffService, taskService, PlatformData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Platforms that DO NOT need amount
const NO_AMOUNT_PLATFORMS = ['WhatsApp API', 'Voice Calling'];

export const CreateTaskDialog = ({ isOpen, onOpenChange, onSuccess }: CreateTaskDialogProps) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    clientName: '',
    clientWap: '',
    campaignName: '',
    year: new Date().getFullYear().toString(),
    location: '',
    remarks: '',
    assignedStaff: [] as string[],
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    deadline: '',
  });

  // Each platform: selectedDates = string[], amount = string, active (for YT/Twitter toggle)
  const [platforms, setPlatforms] = useState<Record<string, { selectedDates: string[]; amount: string; active: boolean }>>({
    'Facebook/Instagram': { selectedDates: [], amount: '', active: true },
    'WhatsApp API':       { selectedDates: [], amount: '', active: true },
    'Voice Calling':      { selectedDates: [], amount: '', active: true },
    'YouTube':            { selectedDates: [], amount: '', active: false },
    'Twitter':            { selectedDates: [], amount: '', active: false },
  });

  const { toast } = useToast();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const allStaff = await staffService.getAll();
      setStaffList(allStaff);
    } catch (error) {
      console.error('Failed to load staff', error);
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '', clientWap: '', campaignName: '',
      year: new Date().getFullYear().toString(), location: '',
      remarks: '', assignedStaff: [], priority: 'P1', deadline: '',
    });
    setPlatforms({
      'Facebook/Instagram': { selectedDates: [], amount: '', active: true },
      'WhatsApp API':       { selectedDates: [], amount: '', active: true },
      'Voice Calling':      { selectedDates: [], amount: '', active: true },
      'YouTube':            { selectedDates: [], amount: '', active: false },
      'Twitter':            { selectedDates: [], amount: '', active: false },
    });
  };

  const addDateToPlatform = (name: string, dateStr: string) => {
    if (!dateStr) return;
    const current = platforms[name].selectedDates;
    if (current.includes(dateStr)) return; // Don't add duplicate
    setPlatforms({
      ...platforms,
      [name]: { ...platforms[name], selectedDates: [...current, dateStr].sort() }
    });
  };

  const removeDateFromPlatform = (name: string, dateStr: string) => {
    const current = platforms[name].selectedDates;
    setPlatforms({
      ...platforms,
      [name]: { ...platforms[name], selectedDates: current.filter(d => d !== dateStr) }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build PlatformData: one entry per selected date per platform
      const activePlatforms: PlatformData[] = [];
      Object.entries(platforms).forEach(([name, data]) => {
        if (data.selectedDates.length > 0) {
          data.selectedDates.forEach(date => {
            activePlatforms.push({
              name,
              startDate: date,
              endDate: date,
              amount: NO_AMOUNT_PLATFORMS.includes(name) ? 0 : (parseFloat(data.amount) || 0),
              status: 'Pending'
            });
          });
        }
      });

      await taskService.create({
        title: `${formData.clientName} - ${formData.campaignName}`,
        description: `Campaign for ${formData.clientName}`,
        clientName: formData.clientName,
        clientWap: formData.clientWap,
        campaignName: formData.campaignName,
        year: formData.year,
        location: formData.location,
        remarks: formData.remarks,
        platforms: activePlatforms,
        assignedStaff: formData.assignedStaff,
        createdBy: 'admin',
        createdByName: 'Administrator',
        priority: formData.priority,
        deadline: formData.deadline || new Date().toISOString().split('T')[0],
        status: 'Pending',
      });

      toast({ title: 'Task created and assigned successfully' });
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  // Format a date string (YYYY-MM-DD) to dd/mm/yyyy
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const handleSendToClient = () => {
    if (!formData.clientWap) {
      toast({ title: 'Please enter a Client WhatsApp number', variant: 'destructive' });
      return;
    }

    let message = `*Campaign: ${formData.campaignName}*\n`;
    message += `Client: ${formData.clientName} | Year: ${formData.year}\n`;
    if (formData.location) message += `Location: ${formData.location}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    Object.entries(platforms).forEach(([name, data]) => {
      if (data.selectedDates.length > 0) {
        // Short alias: Facebook/Instagram → Fb/Insta
        const alias = name === 'Facebook/Instagram' ? 'Fb/Insta' : name;
        message += `*${alias}*\n`;
        message += `Date : ${data.selectedDates.map(fmtDate).join(', ')}\n`;
        if (!NO_AMOUNT_PLATFORMS.includes(name) && data.amount) {
          message += `Amount : ₹${data.amount}/day\n`;
        }
        message += `\n`;
      }
    });

    if (formData.remarks) message += `*Remarks:* ${formData.remarks}\n`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formData.clientWap.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl flex flex-col p-0 overflow-hidden"
        style={{ maxHeight: '90vh', touchAction: 'none' }}
      >
        <DialogHeader className="p-4 pb-2 shrink-0 border-b">
          <DialogTitle className="text-base">Create New Marketing Task</DialogTitle>
          <DialogDescription className="text-xs">
            Fill in campaign details and assign to staff members
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content — touch-action pan-y ensures vertical-only scroll on mobile */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
        >
          <form id="shared-task-form" onSubmit={handleSubmit} className="space-y-4">

            {/* Row 1: Client Name + Wap + Campaign */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Client Name *</label>
                <Input required placeholder="Client name" className="h-8 text-sm"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">WhatsApp Number *</label>
                <Input required placeholder="e.g. 919876543210" className="h-8 text-sm"
                  value={formData.clientWap}
                  onChange={(e) => setFormData({ ...formData, clientWap: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Campaign Name *</label>
                <Input required placeholder="e.g. Summer Sale" className="h-8 text-sm"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })} />
              </div>
            </div>

            {/* Row 2: Year + Location */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Year</label>
                <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-1 sm:col-span-3">
                <label className="text-xs font-medium">Location</label>
                <Input placeholder="e.g. Kolkata, Mumbai" className="h-8 text-sm"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">Platforms & Schedule</h4>
              {Object.entries(platforms).map(([name, data]) => {
                const isOptional = name === 'YouTube' || name === 'Twitter';
                const showAmount = !NO_AMOUNT_PLATFORMS.includes(name);
                return (
                  <div key={name} className="border rounded-lg p-3 bg-card/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{name}</span>
                      {isOptional && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => setPlatforms({ ...platforms, [name]: { ...data, active: !data.active } })}>
                          {data.active ? <><ChevronUp className="w-3 h-3 mr-1" />Hide</> : <><ChevronDown className="w-3 h-3 mr-1" />Show</>}
                        </Button>
                      )}
                    </div>

                    {(!isOptional || data.active) && (
                      <div className={`grid gap-3 ${showAmount ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Date picker */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Add Dates</label>
                          <Input type="date" className="h-8 text-xs"
                            onChange={(e) => { addDateToPlatform(name, e.target.value); e.target.value = ''; }}
                          />
                          {data.selectedDates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {data.selectedDates.map(d => (
                                <span key={d}
                                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full">
                                  {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                  <button type="button" onClick={() => removeDateFromPlatform(name, d)}
                                    className="hover:text-destructive">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Amount – only for non-excluded platforms */}
                        {showAmount && (
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Amount (per day ₹)</label>
                            <Input type="number" placeholder="0.00" className="h-8 text-xs"
                              value={data.amount}
                              onChange={(e) => setPlatforms({ ...platforms, [name]: { ...data, amount: e.target.value } })} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Remarks</label>
              <Textarea placeholder="Additional notes..." rows={2} className="text-sm resize-none"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>

            {/* Assign Staff */}
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Assign Staff
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/20">
                {staffList.map((staff) => (
                  <div key={staff.id} className="flex items-center space-x-2">
                    <Checkbox id={`csd-staff-${staff.id}`}
                      checked={formData.assignedStaff.includes(staff.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setFormData({ ...formData, assignedStaff: [...formData.assignedStaff, staff.id] });
                        else setFormData({ ...formData, assignedStaff: formData.assignedStaff.filter(id => id !== staff.id) });
                      }} />
                    <label htmlFor={`csd-staff-${staff.id}`} className="text-xs cursor-pointer select-none">{staff.name}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority + Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Priority</label>
                <Select value={formData.priority}
                  onValueChange={(v: 'P0' | 'P1' | 'P2') => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 – High</SelectItem>
                    <SelectItem value="P1">P1 – Medium</SelectItem>
                    <SelectItem value="P2">P2 – Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Deadline</label>
                <Input type="date" className="h-8 text-sm"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex flex-wrap gap-2 justify-end bg-muted/10">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={handleSendToClient} className="gap-1">
            <Share2 className="w-3.5 h-3.5" /> Send to Client
          </Button>
          <Button type="submit" form="shared-task-form" variant="royal" size="sm" className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Assign to Staff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
