import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Calendar,
  MessageSquare,
  Trash2,
  Filter,
  History,
  Clock,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Users
} from 'lucide-react';
import { Task, Staff, staffService, taskService, PlatformData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const AdminTasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allTasks = await taskService.getAll();
      setTasks(allTasks);
      const allStaff = await staffService.getAll();
      setStaffList(allStaff);
    } catch (error) {
      console.error("Failed to load tasks data", error);
      toast({ title: 'Failed to load data', variant: 'destructive' });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || 'Unassigned';
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'P0': return 'priority_high';
      case 'P1': return 'priority_medium';
      case 'P2': return 'priority_low';
      default: return 'secondary';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending': return 'status_pending';
      case 'In Progress': return 'status_progress';
      case 'Completed': return 'status_completed';
      default: return 'secondary';
    }
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
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
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

  const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    e.stopPropagation();
    try {
      await taskService.updateStatus(taskId, newStatus, 'admin', 'Administrator');
      toast({ title: `Task status updated to ${newStatus}` });
      loadData();

      // Update selected task if open
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.delete(taskId);
        toast({ title: 'Task deleted' });
        loadData();
        if (selectedTask?.id === taskId) setSelectedTask(null);
      } catch (error) {
        toast({ title: 'Failed to delete task', variant: 'destructive' });
      }
    }
  };

  const groupedTasks = {
    'Pending': filteredTasks.filter(t => t.status === 'Pending'),
    'In Progress': filteredTasks.filter(t => t.status === 'In Progress'),
    'Completed': filteredTasks.filter(t => t.status === 'Completed'),
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground">Create and manage tasks for your team</p>
        </div>
        <Button variant="royal" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.entries(groupedTasks).map(([status, statusTasks]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant={getStatusVariant(status) as any}>{status}</Badge>
                <span className="text-muted-foreground text-sm">({statusTasks.length})</span>
              </h3>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {statusTasks.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center text-muted-foreground text-sm">
                  No {status.toLowerCase()} tasks
                </div>
              ) : (
                statusTasks.map((task) => (
                  <GlassCard
                    key={task.id}
                    className="hover:-translate-y-0.5 cursor-pointer transition-transform"
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                        <Badge variant={getPriorityVariant(task.priority) as any} className="shrink-0 text-xs">
                          {task.priority}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.deadline).toLocaleDateString()}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.assignedStaff?.length > 0 
                            ? `${task.assignedStaff.length} Staff` 
                            : getStaffName(task.assignedTo || '')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {status !== 'Pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => handleStatusChange(e, task.id, 'Pending')}
                          >
                            Pending
                          </Button>
                        )}
                        {status !== 'In Progress' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => handleStatusChange(e, task.id, 'In Progress')}
                          >
                            In Progress
                          </Button>
                        )}
                        {status !== 'Completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-success hover:text-success"
                            onClick={(e) => handleStatusChange(e, task.id, 'Completed')}
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 ml-auto text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(e, task.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {(task.comments.length > 0 || (task.statusHistory && task.statusHistory.length > 0)) && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments.length}
                            </span>
                          )}
                          {task.statusHistory && task.statusHistory.length > 0 && (
                            <span className="flex items-center gap-1">
                              <History className="w-3 h-3" />
                              {task.statusHistory.length} update{task.statusHistory.length !== 1 && 's'}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Create New Marketing Task</DialogTitle>
            <DialogDescription>
              Fill in campaign details and assign to staff members
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 pb-6">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-6 pt-2">
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
                        id={`staff-${staff.id}`} 
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
                        htmlFor={`staff-${staff.id}`}
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

          <div className="p-6 border-t flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSendToClient} className="gap-2">
              <Share2 className="w-4 h-4" />
              Send to Client
            </Button>
            <Button type="submit" form="task-form" variant="royal" className="gap-2">
              <Plus className="w-4 h-4" />
              Assign to Staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details & History Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1">
              <span>{selectedTask?.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityVariant(selectedTask?.priority || 'P1') as any}>
                  {selectedTask?.priority}
                </Badge>
                <Badge variant={getStatusVariant(selectedTask?.status || 'Pending') as any}>
                  {selectedTask?.status}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription className="space-y-1 mt-1">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Assigned to: </span>
                <div className="flex flex-wrap gap-1">
                  {selectedTask?.assignedStaff?.map(id => (
                    <Badge key={id} variant="secondary" className="text-[10px] h-4 px-1">
                      {getStaffName(id)}
                    </Badge>
                  ))}
                  {(!selectedTask?.assignedStaff || selectedTask.assignedStaff.length === 0) && (
                    <span className="text-xs text-muted-foreground">{getStaffName(selectedTask?.assignedTo || '')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Deadline: {selectedTask && new Date(selectedTask.deadline).toLocaleDateString()}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 py-4">
              {selectedTask?.clientName && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-xl bg-muted/20">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Client</p>
                    <p className="text-sm font-medium">{selectedTask.clientName}</p>
                    <p className="text-xs text-muted-foreground">{selectedTask.clientWap}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Campaign</p>
                    <p className="text-sm font-medium">{selectedTask.campaignName}</p>
                  </div>
                </div>
              )}

              {selectedTask?.platforms && selectedTask.platforms.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Platforms & Status</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedTask.platforms.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card text-sm">
                        <div className="space-y-1">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.startDate} to {p.endDate} • ₹{p.amount}/day
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(p.status) as any}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask?.remarks && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Remarks</h4>
                  <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap italic">
                    {selectedTask.remarks}
                  </div>
                </div>
              )}

              {/* Task Updates/Comments from Staff */}
              {selectedTask?.comments && selectedTask.comments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Task Updates ({selectedTask.comments.length})
                  </h4>
                  <div className="space-y-3">
                    {[...selectedTask.comments].reverse().map((comment, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Status History
                </h4>

                {!selectedTask?.statusHistory?.length ? (
                  <p className="text-sm text-muted-foreground italic">No status changes yet.</p>
                ) : (
                  <div className="space-y-4 border-l-2 border-border ml-2 pl-4">
                    {[...selectedTask.statusHistory].reverse().map((update, index) => (
                      <div key={index} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">{update.updatedByName}</span>
                            <span className="text-muted-foreground">changed status</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-muted-foreground">{update.previousStatus}</Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant={getStatusVariant(update.newStatus) as any}>{update.newStatus}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(update.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasksPage;
