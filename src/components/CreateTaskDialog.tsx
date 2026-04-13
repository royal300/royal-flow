import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Share2,
  Users,
  X,
  Calendar as CalendarIcon,
  Trash2
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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

  // Each platform: selectedDates = string[], amount = string, active (for YT/Twitter toggle), 
  // dateTimes = date string -> { hr, min, ampm }, allSameTime = boolean
  const [platforms, setPlatforms] = useState<Record<string, { 
    selectedDates: string[]; 
    amount: string; 
    active: boolean; 
    dateTimes: Record<string, { hr: string; min: string; ampm: string }>;
    allSameTime: boolean;
  }>>({
    'Facebook/Instagram': { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
    'WhatsApp API':       { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
    'Voice Calling':      { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
    'YouTube':            { selectedDates: [], amount: '', active: false, dateTimes: {}, allSameTime: true },
    'Twitter':            { selectedDates: [], amount: '', active: false, dateTimes: {}, allSameTime: true },
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
      'Facebook/Instagram': { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
      'WhatsApp API':       { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
      'Voice Calling':      { selectedDates: [], amount: '', active: true, dateTimes: {}, allSameTime: true },
      'YouTube':            { selectedDates: [], amount: '', active: false, dateTimes: {}, allSameTime: true },
      'Twitter':            { selectedDates: [], amount: '', active: false, dateTimes: {}, allSameTime: true },
    });
  };

  const updateDateTime = (platformName: string, date: string, field: 'hr' | 'min' | 'ampm', value: string) => {
    const p = platforms[platformName];
    const newDateTimes = { ...p.dateTimes };
    
    // Initialize if doesn't exist
    if (!newDateTimes[date]) {
      newDateTimes[date] = { hr: '11', min: '00', ampm: 'AM' };
    }
    
    newDateTimes[date] = { ...newDateTimes[date], [field]: value };
    
    // Sync if All Same Time is checked
    if (p.allSameTime) {
      p.selectedDates.forEach(d => {
        newDateTimes[d] = { ...newDateTimes[date] };
      });
    }
    
    setPlatforms({
      ...platforms,
      [platformName]: { ...p, dateTimes: newDateTimes }
    });
  };

  const toggleAllSameTime = (platformName: string, checked: boolean) => {
    const p = platforms[platformName];
    const newDateTimes = { ...p.dateTimes };
    
    if (checked && p.selectedDates.length > 0) {
      const firstDate = p.selectedDates[0];
      const masterTime = newDateTimes[firstDate] || { hr: '11', min: '00', ampm: 'AM' };
      p.selectedDates.forEach(d => {
        newDateTimes[d] = { ...masterTime };
      });
    }
    
    setPlatforms({
      ...platforms,
      [platformName]: { ...p, allSameTime: checked, dateTimes: newDateTimes }
    });
  };

  const addDateToPlatform = (name: string, dateStr: string) => {
    if (!dateStr) return;
    const p = platforms[name];
    const current = p.selectedDates;
    if (current.includes(dateStr)) return;
    
    const newSelectedDates = [...current, dateStr].sort();
    const newDateTimes = { ...p.dateTimes };
    
    // Default time for new date
    const defaultTime = p.allSameTime && current.length > 0 
      ? (newDateTimes[current[0]] || { hr: '11', min: '00', ampm: 'AM' })
      : { hr: '11', min: '00', ampm: 'AM' };
      
    newDateTimes[dateStr] = { ...defaultTime };
    
    setPlatforms({
      ...platforms,
      [name]: { ...p, selectedDates: newSelectedDates, dateTimes: newDateTimes }
    });
  };

  const removeDateFromPlatform = (name: string, dateStr: string) => {
    const p = platforms[name];
    const current = p.selectedDates;
    const newDateTimes = { ...p.dateTimes };
    delete newDateTimes[dateStr];

    setPlatforms({
      ...platforms,
      [name]: { ...p, selectedDates: current.filter(d => d !== dateStr), dateTimes: newDateTimes }
    });
  };

  const clearDatesForPlatform = (name: string) => {
    setPlatforms({
      ...platforms,
      [name]: { ...platforms[name], selectedDates: [], dateTimes: {} }
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
            const dt = data.dateTimes[date] || { hr: '11', min: '00', ampm: 'AM' };
            const timeStr = `${dt.hr}:${dt.min} ${dt.ampm}`;
            
            activePlatforms.push({
              name,
              startDate: date,
              endDate: date,
              amount: NO_AMOUNT_PLATFORMS.includes(name) ? 0 : (parseFloat(data.amount) || 0),
              times: [timeStr],
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
    try {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch (e) {
      return d;
    }
  };

  const fmtDateCondensed = (d: string) => {
    try {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${day}/${m}`;
    } catch (e) {
      return d;
    }
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
        
        data.selectedDates.forEach(date => {
          const dt = data.dateTimes[date] || { hr: '11', min: '00', ampm: 'AM' };
          const timeStr = `${dt.hr}:${dt.min} ${dt.ampm}`;
          message += `Date : ${fmtDate(date)} | Time : ${timeStr}\n`;
        });

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
        className="w-[calc(100vw-24px)] max-w-2xl flex flex-col p-0 overflow-hidden"
        style={{ maxHeight: '90svh', touchAction: 'none' }}
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
          style={{ overscrollBehavior: 'contain', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
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
                        {/* Date selection inside input-like field */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Select Dates</label>
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "flex-1 h-10 px-3 justify-start text-left font-normal bg-background border-input",
                                    data.selectedDates.length === 0 && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">
                                    {data.selectedDates.length > 0 
                                      ? data.selectedDates.map(fmtDateCondensed).join(', ') 
                                      : "Pick dates"}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="multiple"
                                  selected={data.selectedDates.map(d => parseISO(d))}
                                  onSelect={(dates) => {
                                    const dateStrings = (dates || []).map(d => format(d, 'yyyy-MM-dd')).sort();
                                    setPlatforms({
                                      ...platforms,
                                      [name]: { ...platforms[name], selectedDates: dateStrings }
                                    });
                                  }}
                                  initialFocus
                                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                />
                              </PopoverContent>
                            </Popover>
                            
                            {data.selectedDates.length > 0 && (
                              <Button 
                                type="button"
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10"
                                onClick={() => clearDatesForPlatform(name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {/* Amount – only for non-excluded platforms */}
                        {showAmount && (
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Amount (per day ₹)</label>
                            <Input type="number" placeholder="0.00" className="h-10"
                              value={data.amount}
                              onChange={(e) => setPlatforms({ ...platforms, [name]: { ...data, amount: e.target.value } })} />
                          </div>
                        )}

                        {/* Multiple Time inputs – only for WhatsApp/Voice */}
                        {NO_AMOUNT_PLATFORMS.includes(name) && data.selectedDates.length > 0 && (
                          <div className="space-y-2 col-span-full border-t pt-2 mt-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Schedule Times</label>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`sync-time-${name}`} 
                                  checked={data.allSameTime} 
                                  onCheckedChange={(checked) => toggleAllSameTime(name, checked === true)} 
                                />
                                <label htmlFor={`sync-time-${name}`} className="text-[10px] cursor-pointer">All Same Time</label>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {data.selectedDates.map((date) => {
                                const dt = data.dateTimes[date] || { hr: '11', min: '00', ampm: 'AM' };
                                return (
                                  <div key={date} className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/50">
                                    <span className="text-[10px] font-bold w-12 shrink-0">{fmtDateCondensed(date)}</span>
                                    <div className="flex items-center gap-1 flex-1 justify-end">
                                      <Input 
                                        type="text" 
                                        className="h-7 w-8 text-center p-0 text-xs" 
                                        value={dt.hr}
                                        onChange={(e) => updateDateTime(name, date, 'hr', e.target.value.slice(0, 2))}
                                      />
                                      <span className="text-xs">:</span>
                                      <Input 
                                        type="text" 
                                        className="h-7 w-8 text-center p-0 text-xs" 
                                        value={dt.min}
                                        onChange={(e) => updateDateTime(name, date, 'min', e.target.value.slice(0, 2))}
                                      />
                                      <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-[10px] min-w-[36px]"
                                        onClick={() => updateDateTime(name, date, 'ampm', dt.ampm === 'AM' ? 'PM' : 'AM')}
                                      >
                                        {dt.ampm}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-8 px-3 justify-start text-left font-normal bg-background border-input",
                        !formData.deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs truncate">
                        {formData.deadline ? fmtDate(formData.deadline) : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formData.deadline ? parseISO(formData.deadline) : undefined}
                      onSelect={(date) => {
                        if (date) setFormData({ ...formData, deadline: format(date, 'yyyy-MM-dd') });
                      }}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    />
                  </PopoverContent>
                </Popover>
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
