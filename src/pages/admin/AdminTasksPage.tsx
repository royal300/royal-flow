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
  Filter
} from 'lucide-react';
import { Task, Staff, staffService, taskService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
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

const AdminTasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    deadline: '',
    status: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTasks(taskService.getAll());
    setStaffList(staffService.getAll());
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'P0': return 'P0 (High)';
      case 'P1': return 'P1 (Medium)';
      case 'P2': return 'P2 (Low)';
      default: return priority;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    taskService.create({
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo,
      priority: formData.priority,
      deadline: formData.deadline,
      status: formData.status,
    });
    
    toast({ title: 'Task created successfully' });
    setIsDialogOpen(false);
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'P1',
      deadline: '',
      status: 'Pending',
    });
    loadData();
  };

  const handleStatusChange = (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    taskService.update(taskId, { status: newStatus });
    toast({ title: `Task status updated to ${newStatus}` });
    loadData();
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      taskService.delete(taskId);
      toast({ title: 'Task deleted' });
      loadData();
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
                  <GlassCard key={task.id} className="hover:-translate-y-0.5">
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
                        <span>{getStaffName(task.assignedTo)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {status !== 'Pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handleStatusChange(task.id, 'Pending')}
                          >
                            Pending
                          </Button>
                        )}
                        {status !== 'In Progress' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handleStatusChange(task.id, 'In Progress')}
                          >
                            In Progress
                          </Button>
                        )}
                        {status !== 'Completed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-success hover:text-success"
                            onClick={() => handleStatusChange(task.id, 'Completed')}
                          >
                            Complete
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 ml-auto text-destructive hover:text-destructive"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {task.comments.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          {task.comments.length} comment{task.comments.length !== 1 && 's'}
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

      {/* Create Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Assign a task to a team member with priority and deadline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title</label>
              <Input
                required
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                required
                placeholder="Describe the task..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign To</label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deadline</label>
              <Input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="royal">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasksPage;
