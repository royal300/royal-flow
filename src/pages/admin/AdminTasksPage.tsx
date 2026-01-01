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
  ArrowRight
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
    assignedTo: '',
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    deadline: '',
    status: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
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
      await taskService.create({
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        createdBy: 'admin',
        createdByName: 'Administrator',
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
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
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
                        <span>{getStaffName(task.assignedTo)}</span>
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

      {/* Task Details & History Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-start justify-between gap-4">
              <span>{selectedTask?.title}</span>
              <Badge variant={getPriorityVariant(selectedTask?.priority || 'P1') as any}>
                {selectedTask?.priority}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {selectedTask ? getStaffName(selectedTask.assignedTo) : ''}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Deadline: {selectedTask && new Date(selectedTask.deadline).toLocaleDateString()}
              </span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Description</h4>
                <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTask?.description}
                </div>
              </div>

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
