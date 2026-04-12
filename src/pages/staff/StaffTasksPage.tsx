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
  Trash2,
  ChevronRight,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { Task, taskService } from '@/lib/storage';
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
  // Expanded campaign: null = list view, taskId = detail view
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
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
    if (session?.userId) loadTasks();
  }, [session]);

  const loadTasks = async () => {
    if (!session?.userId) return;
    try {
      const data = await taskService.getAll();
      const myTasks = data.filter(t =>
        t.assignedStaff?.includes(session.userId) ||
        t.assignedTo === session.userId
      );
      setTasks(myTasks);
    } catch (error) {
      console.error('Failed to load tasks', error);
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

  // Toggle a SPECIFIC platform entry by its ARRAY INDEX — fully isolated
  const handlePlatformToggle = async (taskId: string, platformIndex: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.platforms) return;

      // Match ONLY by index — no chance of hitting a same-named entry
      const updatedPlatforms = task.platforms.map((p, idx) =>
        idx === platformIndex ? { ...p, status: newStatus as any } : p
      );

      const allCompleted = updatedPlatforms.every(p => p.status === 'Completed');
      const anyInProgress = updatedPlatforms.some(p => p.status !== 'Pending');
      const mainStatus = allCompleted ? 'Completed' : anyInProgress ? 'In Progress' : 'Pending';

      await taskService.update(taskId, { platforms: updatedPlatforms, status: mainStatus });
      toast({ title: `Marked as ${newStatus}`, duration: 1500 });
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    const task = tasks.find(t => t.id === expandedTaskId);
    if (!task || !comment.trim() || !session) return;

    try {
      await taskService.addComment(task.id, {
        taskId: task.id,
        authorId: session.userId,
        authorName: session.name,
        content: comment.trim(),
      });
      toast({ title: 'Comment added' });
      setComment('');
      loadTasks();
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
      setFormData({ title: '', description: '', priority: 'P1', deadline: '' });
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !session) return;

    if (task.createdBy !== session.userId) {
      toast({ title: 'Permission denied', description: 'You can only delete your own tasks', variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.delete(taskId);
      toast({ title: 'Task deleted' });
      if (expandedTaskId === taskId) setExpandedTaskId(null);
      loadTasks();
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  // Build daily date-sorted entries PER TASK for the detail view — includes original index for isolation
  const getTaskDailyItems = (task: Task) => {
    if (!task.platforms || task.platforms.length === 0) return [];
    const items = task.platforms.map((p, idx) => ({
      platformName: p.name,
      date: p.startDate,
      amount: p.amount,
      status: p.status,
      platformIndex: idx,  // ← unique key for toggle isolation
    }));
    // Sort ascending by date
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Group daily items by date for the detail view
  const groupByDate = (items: ReturnType<typeof getTaskDailyItems>) => {
    return items.reduce((groups: Record<string, typeof items>, item) => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
      return groups;
    }, {});
  };

  const selectedTask = expandedTaskId ? tasks.find(t => t.id === expandedTaskId) : null;
  const dailyItems = selectedTask ? getTaskDailyItems(selectedTask) : [];
  const groupedByDate = groupByDate(dailyItems);

  // Calculate progress for a task
  const getTaskProgress = (task: Task) => {
    if (!task.platforms || task.platforms.length === 0) return null;
    const total = task.platforms.length;
    const done = task.platforms.filter(p => p.status === 'Completed').length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <p className="text-muted-foreground text-sm">View and manage your assigned tasks</p>
        </div>
        <Button variant="royal" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'Pending', value: stats.pending, color: 'text-warning' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-primary' },
          { label: 'Completed', value: stats.completed, color: 'text-success' },
        ].map(s => (
          <GlassCard key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </GlassCard>
        ))}
      </div>

      {/* Campaign Card List OR Detail View */}
      {!selectedTask ? (
        /* ── LIST: one card per campaign ── */
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Campaigns</h3>
          {tasks.length === 0 ? (
            <GlassCard>
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No tasks assigned</h3>
                <p className="text-muted-foreground text-sm">You don't have any campaigns yet.</p>
              </CardContent>
            </GlassCard>
          ) : (
            tasks.map(task => {
              const progress = getTaskProgress(task);
              return (
                <GlassCard
                  key={task.id}
                  className="cursor-pointer hover:-translate-y-0.5 transition-all bg-primary text-primary-foreground border-primary/50"
                  onClick={() => setExpandedTaskId(task.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate text-white">
                            {task.clientName || task.title}
                          </h4>
                          <Badge variant={getPriorityVariant(task.priority) as any} className="text-[10px] h-4 px-1 shrink-0">
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-primary-foreground/80 mt-0.5">
                          {task.campaignName} {task.year ? `(${task.year})` : ''} {task.location ? `• ${task.location}` : ''}
                        </p>
                        {progress && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-white/30 rounded-full h-1.5">
                              <div
                                className="h-full rounded-full bg-white transition-all"
                                style={{ width: `${progress.pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-white/80 shrink-0">
                              {progress.done}/{progress.total}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(task.status) as any} className="text-[10px] h-5 shrink-0">
                          {task.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
                      </div>
                    </div>
                  </CardContent>
                </GlassCard>
              );
            })
          )}
        </div>
      ) : (
        /* ── DETAIL: date-wise task checkboxes ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setExpandedTaskId(null)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div>
              <h3 className="font-semibold">{selectedTask.clientName || selectedTask.title}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedTask.campaignName} {selectedTask.year ? `(${selectedTask.year})` : ''} {selectedTask.location ? `• ${selectedTask.location}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Date-wise Checkboxes */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Date-wise Tasks</h4>
              {Object.entries(groupedByDate).map(([date, items]) => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold">
                      {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                        weekday: 'short', day: 'numeric', month: 'short'
                      })}
                    </span>
                    {date === new Date().toISOString().split('T')[0] && (
                      <Badge variant="royal" className="text-[9px] h-4 px-1.5">TODAY</Badge>
                    )}
                  </div>
                  {items.map(item => (
                    <GlassCard key={`${item.platformName}-${item.date}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`cb-${selectedTask.id}-idx-${item.platformIndex}`}
                            checked={item.status === 'Completed'}
                            onCheckedChange={() =>
                              handlePlatformToggle(selectedTask.id, item.platformIndex, item.status)
                            }
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${item.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {item.platformName}
                            </p>
                            {item.amount > 0 && (
                              <p className="text-[11px] text-muted-foreground">₹{item.amount}/day</p>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(item.status) as any} className="text-[10px] h-4 px-1 shrink-0">
                            {item.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </GlassCard>
                  ))}
                </div>
              ))}
              {dailyItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No platform tasks configured.</p>
              )}
            </div>

            {/* Details + Comments */}
            <div className="space-y-3">
              {selectedTask.clientName && (
                <GlassCard>
                  <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
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
                    {selectedTask.remarks && (
                      <div className="col-span-2 pt-1 border-t">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Remarks</p>
                        <p>{selectedTask.remarks}</p>
                      </div>
                    )}
                  </CardContent>
                </GlassCard>
              )}

              {/* Delete (if own task) */}
              {session && selectedTask.createdBy === session.userId && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                </Button>
              )}

              {/* Comments */}
              <GlassCard>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Updates ({selectedTask.comments?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTask.comments?.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No updates yet.</p>
                    ) : (
                      selectedTask.comments?.map(c => (
                        <div key={c.id} className="p-2 rounded-lg bg-muted/50 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{c.authorName}</span>
                            <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p>{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add an update..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="flex-1 text-sm resize-none"
                    />
                    <Button variant="royal" size="icon" onClick={handleAddComment} disabled={!comment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Create a task for yourself</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title</label>
              <Input required placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea required placeholder="Describe the task..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority}
                  onValueChange={(v: 'P0' | 'P1' | 'P2') => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 (High)</SelectItem>
                    <SelectItem value="P1">P1 (Medium)</SelectItem>
                    <SelectItem value="P2">P2 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline</label>
                <Input type="date" required value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="royal">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffTasksPage;
