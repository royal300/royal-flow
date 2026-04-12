import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  CheckSquare,
  Calendar,
  MessageSquare,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { Task, taskService, staffService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
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

const StaffTasksPage = () => {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    deadline: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (session?.userId) {
      loadTasks();
    }
  }, [session]);

  const loadTasks = async () => {
    if (session?.userId) {
      try {
        const data = await taskService.getAll();
        // Filter tasks where this staff member is in assignedStaff or assignedTo
        const myTasks = data.filter(t => 
          t.assignedStaff?.includes(session.userId) || 
          t.assignedTo === session.userId
        );
        setTasks(myTasks);
      } catch (error) {
        console.error("Failed to load tasks", error);
      }
    }
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

  const handleStatusChange = async (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    if (!session) return;
    try {
      await taskService.updateStatus(taskId, newStatus, session.userId, session.name);
      toast({ title: `Task marked as ${newStatus}` });
      loadTasks();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !comment.trim() || !session) return;

    try {
      await taskService.addComment(selectedTask.id, {
        taskId: selectedTask.id,
        authorId: session.userId,
        authorName: session.name,
        content: comment.trim(),
      });

      toast({ title: 'Comment added' });
      setComment('');
      loadTasks();

      const updatedTask = await taskService.getById(selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      await taskService.create({
        title: formData.title,
        description: formData.description,
        assignedStaff: [session.userId],
        createdBy: session.userId,
        createdByName: session.name,
        priority: formData.priority,
        deadline: formData.deadline,
        status: 'Pending',
      });

      toast({ title: 'Task created successfully' });
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        priority: 'P1',
        deadline: '',
      });
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const handlePlatformStatusToggle = async (taskId: string, platformName: string, currentStatus: string) => {
    if (!session) return;
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.platforms) return;

      const updatedPlatforms = task.platforms.map(p => 
        p.name === platformName ? { ...p, status: newStatus as any } : p
      );

      // Check if all platforms are completed to auto-update main task status
      const allCompleted = updatedPlatforms.every(p => p.status === 'Completed');
      const updatedMainStatus = allCompleted ? 'Completed' : 'In Progress';

      await taskService.update(taskId, { 
        platforms: updatedPlatforms,
        status: updatedMainStatus
      });
      
      toast({ title: `${platformName} marked as ${newStatus}` });
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to update platform status', variant: 'destructive' });
    }
  };

  const flattenTasksByDate = () => {
    const dailyItems: any[] = [];
    
    tasks.forEach(task => {
      // Handle new structured tasks
      if (task.platforms && task.platforms.length > 0) {
        task.platforms.forEach(platform => {
          const start = new Date(platform.startDate);
          const end = new Date(platform.endDate);
          
          // Generate an entry for each day in range
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyItems.push({
              id: `${task.id}-${platform.name}-${dateStr}`,
              taskId: task.id,
              clientName: task.clientName || 'Unknown Client',
              campaignName: task.campaignName || 'General',
              platformName: platform.name,
              date: dateStr,
              amount: platform.amount,
              status: platform.status,
              priority: task.priority,
              year: task.year,
              location: task.location
            });
          }
        });
      } else {
        // Handle legacy/simple tasks
        dailyItems.push({
          id: task.id,
          taskId: task.id,
          clientName: 'N/A',
          campaignName: task.title,
          platformName: 'General Task',
          date: task.deadline,
          amount: 0,
          status: task.status,
          priority: task.priority,
          isLegacy: true
        });
      }
    });

    // Sort by date (descending)
    return dailyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const groupedDailyItems = flattenTasksByDate().reduce((groups: any, item) => {
    const date = item.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {});

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !session) return;

    // Check if staff created this task
    if (task.createdBy !== session.userId) {
      toast({
        title: 'Permission denied',
        description: 'You can only delete tasks you created',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.delete(taskId);
      toast({ title: 'Task deleted successfully' });
      if (selectedTask?.id === taskId) setSelectedTask(null);
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && deadline;
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <p className="text-muted-foreground">View and manage your assigned tasks</p>
        </div>
        <Button variant="royal" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Daily Assignments</h2>

          {Object.keys(groupedDailyItems).length === 0 ? (
            <GlassCard>
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
                <p className="text-muted-foreground">
                  You don't have any daily assignments yet.
                </p>
              </CardContent>
            </GlassCard>
          ) : (
            Object.entries(groupedDailyItems).map(([date, items]: [string, any]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">
                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {date === new Date().toISOString().split('T')[0] && (
                    <Badge variant="royal" className="text-[10px] h-4">TODAY</Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <GlassCard
                      key={item.id}
                      className={`transition-all ${selectedTask?.id === item.taskId ? 'ring-2 ring-primary' : 'hover:-translate-y-0.5'
                        }`}
                      onClick={() => setSelectedTask(tasks.find(t => t.id === item.taskId) || null)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={item.status === 'Completed'}
                              onCheckedChange={() => {
                                if (item.isLegacy) {
                                  handleStatusChange(item.taskId, item.status === 'Completed' ? 'Pending' : 'Completed');
                                } else {
                                  handlePlatformStatusToggle(item.taskId, item.platformName, item.status);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="space-y-0.5">
                              <h4 className={`font-medium text-sm ${item.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {item.clientName !== 'N/A' ? `${item.clientName}: ` : ''}{item.platformName}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                {item.campaignName} {item.year ? `(${item.year})` : ''} {item.location ? `• ${item.location}` : ''} {item.amount > 0 ? `• ₹${item.amount}/day` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getPriorityVariant(item.priority) as any} className="text-[10px] h-4 px-1 shrink-0">
                            {item.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Task Details */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Task Details</h2>

          {!selectedTask ? (
            <GlassCard>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a task</h3>
                <p className="text-muted-foreground">
                  Click on a task to view details and add updates
                </p>
              </CardContent>
            </GlassCard>
          ) : (
            <GlassCard>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{selectedTask.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getPriorityVariant(selectedTask.priority) as any}>
                        {selectedTask.priority}
                      </Badge>
                      <Badge variant={getStatusVariant(selectedTask.status) as any}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>

                {selectedTask.clientName && (
                  <div className="grid grid-cols-2 gap-4 p-3 border rounded-xl bg-muted/20 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Client</p>
                      <p className="font-medium">{selectedTask.clientName}</p>
                      <p className="text-muted-foreground">{selectedTask.clientWap}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Campaign</p>
                      <p className="font-medium">{selectedTask.campaignName} {selectedTask.year && `(${selectedTask.year})`}</p>
                      {selectedTask.location && <p className="text-muted-foreground">{selectedTask.location}</p>}
                    </div>
                  </div>
                )}

                {selectedTask.platforms && selectedTask.platforms.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Platforms</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedTask.platforms.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-lg bg-card text-xs">
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-muted-foreground">
                              {p.startDate} to {p.endDate}
                            </p>
                          </div>
                          <Badge variant={getStatusVariant(p.status) as any} className="text-[10px] h-4">
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Due: {new Date(selectedTask.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedTask.status !== 'In Progress' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedTask.id, 'In Progress')}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Start Working
                    </Button>
                  )}
                  {selectedTask.status !== 'Completed' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleStatusChange(selectedTask.id, 'Completed')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                  {/* Delete button - only for tasks created by this staff member */}
                  {session && selectedTask.createdBy === session.userId && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="ml-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Comments */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Updates ({selectedTask.comments.length})
                  </h4>

                  <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                    {selectedTask.comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No updates yet. Add your first update below.
                      </p>
                    ) : (
                      selectedTask.comments.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{c.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add an update..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="royal"
                      size="icon"
                      onClick={handleAddComment}
                      disabled={!comment.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a task for yourself with priority and deadline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4">
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
                <label className="text-sm font-medium">Deadline</label>
                <Input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
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

export default StaffTasksPage;
