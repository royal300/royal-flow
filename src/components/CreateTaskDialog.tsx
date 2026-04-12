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
  Users
} from 'lucide-react';
import { Task, Staff, staffService, taskService, PlatformData } from '@/lib/storage';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateTaskDialog = ({ isOpen, onOpenChange, onSuccess }: CreateTaskDialogProps) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientName: '',
    clientWap: '',
    campaignName: '',
    year: new Date().getFullYear().toString(),
    location: '',
    remarks: '',
    assignedStaff: [] as string[],
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    deadline: '',
    status: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
  });

  const [platforms, setPlatforms] = useState<Record<string, any>>({
    'Facebook/Instagram': { active: true, startDate: '', endDate: '', amount: '' },
    'WhatsApp API': { active: true, startDate: '', endDate: '', amount: '' },
    'Voice Calling': { active: true, startDate: '', endDate: '', amount: '' },
    'YouTube': { active: false, startDate: '', endDate: '', amount: '', collapsed: true },
    'Twitter': { active: false, startDate: '', endDate: '', amount: '', collapsed: true },
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
      console.error("Failed to load staff", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      clientName: '',
      clientWap: '',
      campaignName: '',
      year: new Date().getFullYear().toString(),
      location: '',
      remarks: '',
      assignedStaff: [],
      priority: 'P1',
      deadline: '',
      status: 'Pending',
    });
    setPlatforms({
      'Facebook/Instagram': { active: true, startDate: '', endDate: '', amount: '' },
      'WhatsApp API': { active: true, startDate: '', endDate: '', amount: '' },
      'Voice Calling': { active: true, startDate: '', endDate: '', amount: '' },
      'YouTube': { active: false, startDate: '', endDate: '', amount: '', collapsed: true },
      'Twitter': { active: false, startDate: '', endDate: '', amount: '', collapsed: true },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const activePlatforms: PlatformData[] = Object.entries(platforms)
        .filter(([_, data]) => data.startDate || data.endDate || data.amount)
        .map(([name, data]) => ({
          name,
          startDate: data.startDate,
          endDate: data.endDate,
          amount: parseFloat(data.amount) || 0,
          status: 'Pending'
        }));

      await taskService.create({
        title: formData.title || `${formData.clientName} - ${formData.campaignName}`,
        description: formData.description || `Campaign for ${formData.clientName}`,
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
        status: formData.status,
      });

      toast({ title: 'Task created and assigned successfully' });
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const handleSendToClient = () => {
    if (!formData.clientWap) {
      toast({ title: 'Please enter a Client WhatsApp number', variant: 'destructive' });
      return;
    }

    let message = `*Campaign Details: ${formData.campaignName}*\n\n`;
    message += `Client: ${formData.clientName}\n`;
    message += `Year: ${formData.year}\n`;
    message += `Location: ${formData.location}\n`;
    message += `--------------------------\n`;
    
    Object.entries(platforms).forEach(([name, data]) => {
      if (data.startDate || data.endDate || data.amount) {
        message += `*${name}*\n`;
        message += `Dates: ${data.startDate} to ${data.endDate}\n`;
        message += `Amount: ₹${data.amount}/day\n\n`;
      }
    });

    if (formData.remarks) {
      message += `*Remarks:* ${formData.remarks}\n`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formData.clientWap.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Create New Marketing Task</DialogTitle>
          <DialogDescription>
            Fill in campaign details and assign to staff members
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6 shadow-inner">
          <form id="shared-task-form" onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Client & Campaign Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Name</label>
                <Input
                  required
                  placeholder="Enter client name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Wap Number</label>
                <Input
                  required
                  placeholder="WhatsApp number"
                  value={formData.clientWap}
                  onChange={(e) => setFormData({ ...formData, clientWap: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  required
                  placeholder="e.g. Summer Sale"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select 
                  value={formData.year} 
                  onValueChange={(value) => setFormData({ ...formData, year: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 md:col-span-2 lg:col-span-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="e.g. Kolkata, Mumbai, Bangalore"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold border-b pb-1">Platforms & Schedule</h4>
              
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(platforms).map(([name, data]) => (
                  <div key={name} className="p-4 border rounded-xl bg-card/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold flex items-center gap-2">
                        {name}
                      </label>
                      {(name === 'YouTube' || name === 'Twitter') ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          className="h-8 px-2 text-xs"
                          onClick={() => setPlatforms({
                            ...platforms,
                            [name]: { ...data, active: !data.active }
                          })}
                        >
                          {data.active ? 'Hide Inputs' : 'Show Inputs'}
                          {data.active ? <ChevronUp className="ml-1 w-3 h-3" /> : <ChevronDown className="ml-1 w-3 h-3" />}
                        </Button>
                      ) : null}
                    </div>

                    {((name !== 'YouTube' && name !== 'Twitter') || data.active) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Select Date Duration</label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="date" 
                              className="h-9 text-xs" 
                              value={data.startDate} 
                              onChange={(e) => setPlatforms({
                                ...platforms,
                                [name]: { ...data, startDate: e.target.value }
                              })}
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input 
                              type="date" 
                              className="h-9 text-xs" 
                              value={data.endDate} 
                              onChange={(e) => setPlatforms({
                                ...platforms,
                                [name]: { ...data, endDate: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Amount (per day)</label>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            className="h-9" 
                            value={data.amount} 
                            onChange={(e) => setPlatforms({
                              ...platforms,
                              [name]: { ...data, amount: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                placeholder="Additional notes for staff..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
              />
            </div>

            {/* Assign Staff */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assign Staff Members
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-xl bg-muted/20">
                {staffList.map((staff) => (
                  <div key={staff.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`shared-staff-${staff.id}`} 
                      checked={formData.assignedStaff.includes(staff.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, assignedStaff: [...formData.assignedStaff, staff.id] });
                        } else {
                          setFormData({ ...formData, assignedStaff: formData.assignedStaff.filter(id => id !== staff.id) });
                        }
                      }}
                    />
                    <label 
                      htmlFor={`shared-staff-${staff.id}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {staff.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'P0' | 'P1' | 'P2') => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 (High)</SelectItem>
                    <SelectItem value="P1">P1 (Medium)</SelectItem>
                    <SelectItem value="P2">P2 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline (Admin Reference)</label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="p-6 border-t flex flex-wrap gap-3 justify-end bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSendToClient} className="gap-2">
            <Share2 className="w-4 h-4" />
            Send to Client
          </Button>
          <Button type="submit" form="shared-task-form" variant="royal" className="gap-2">
            <Plus className="w-4 h-4" />
            Assign to Staff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
