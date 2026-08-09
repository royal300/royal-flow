import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Crown,
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  BarChart3,
  LogOut,
  Menu,
  X,
  Wallet,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Staff', path: '/admin/staff' },
  { icon: CheckSquare, label: 'Tasks', path: '/admin/tasks' },
  { icon: Calendar, label: 'Attendance', path: '/admin/attendance' },
  { icon: BarChart3, label: 'Daily Report', path: '/admin/reports' },
  { icon: Wallet, label: 'Accounts', path: '/admin/accounts' },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#FACC15] border-r border-yellow-500/40 text-black flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0 shadow-lg h-screen",
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-0 lg:border-r-0" : "lg:w-64"
      )}>
        <div className="w-64 flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-yellow-500/40 shrink-0">
            <Link to="/admin" className="flex items-center">
              <img src="/logo.png" alt="Royal 300" className="h-10" />
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-md text-black/80 hover:text-black hover:bg-yellow-300/60 transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-5 h-5 text-black" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 text-black/80 hover:text-black"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-white text-black font-bold shadow-md"
                      : "text-black/85 hover:text-black hover:bg-white/60 font-semibold"
                  )}
                >
                  <item.icon className="w-5 h-5 text-black shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-yellow-500/40">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span className="text-black font-bold text-sm">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-black truncate">{session?.name || 'Administrator'}</p>
                <p className="text-xs text-black/80 font-medium truncate">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-black/85 hover:text-black hover:bg-white/60 font-semibold"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2 text-black" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen w-full min-w-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:ml-0" : "lg:ml-64"
      )}>
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-semibold">
              {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
              Admin Panel
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
