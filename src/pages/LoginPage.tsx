import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Shield, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(email, password, role);

    if (success) {
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${role === 'admin' ? 'Administrator' : 'Staff'}`,
      });
      navigate(role === 'admin' ? '/admin' : '/staff');
    } else {
      toast({
        title: 'Login failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-royal flex items-center justify-center shadow-glow">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-gradient-royal">ROYAL</span>
              <span className="text-secondary">300</span>
            </span>
          </div>
          <p className="text-muted-foreground">Employee Task Tracker</p>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => setRole('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${role === 'staff'
              ? 'bg-card shadow-sm text-success'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <User className="w-4 h-4" />
            Staff
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${role === 'admin'
              ? 'bg-card shadow-sm text-destructive'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Shield className="w-4 h-4" />
            Admin
          </button>
        </div>

        {/* Login Form */}
        <GlassCard>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {role === 'admin' ? 'Admin Login' : 'Staff Login'}
            </CardTitle>
            <CardDescription>
              {role === 'admin'
                ? 'Access the admin dashboard'
                : 'Sign in to view your tasks'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className={`w-full mt-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${role === 'admin'
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default LoginPage;
