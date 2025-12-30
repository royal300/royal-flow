import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckSquare,
  Calendar,
  MessageSquare,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Task, taskService, staffService } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const StaffTasksPage = () => {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (session?.userId) {
      loadTasks();
    }
  }, [session]);

  const loadTasks = () => {
    if (session?.userId) {
      setTasks(taskService.getByStaffId(session.userId));
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

  const handleStatusChange = (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    taskService.update(taskId, { status: newStatus });
    toast({ title: `Task marked as ${newStatus}` });
    loadTasks();
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  const handleAddComment = () => {
    if (!selectedTask || !comment.trim() || !session) return;
    
    taskService.addComment(selectedTask.id, {
      taskId: selectedTask.id,
      authorId: session.userId,
      authorName: session.name,
      content: comment.trim(),
    });
    
    toast({ title: 'Comment added' });
    setComment('');
    loadTasks();
    
    const updatedTask = taskService.getById(selectedTask.id);
    if (updatedTask) {
      setSelectedTask(updatedTask);
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
        {/* Task List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Tasks</h2>
          
          {tasks.length === 0 ? (
            <GlassCard>
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
                <p className="text-muted-foreground">
                  You don't have any tasks yet. Check back later!
                </p>
              </CardContent>
            </GlassCard>
          ) : (
            tasks.map((task) => (
              <GlassCard 
                key={task.id} 
                className={`cursor-pointer transition-all ${
                  selectedTask?.id === task.id ? 'ring-2 ring-primary' : 'hover:-translate-y-0.5'
                }`}
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant={getPriorityVariant(task.priority) as any}>
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className={isOverdue(task.deadline) && task.status !== 'Completed' ? 'text-destructive' : ''}>
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                      {isOverdue(task.deadline) && task.status !== 'Completed' && (
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      )}
                    </div>
                    <Badge variant={getStatusVariant(task.status) as any}>
                      {task.status}
                    </Badge>
                  </div>
                </CardContent>
              </GlassCard>
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
    </div>
  );
};

export default StaffTasksPage;
