import { lazy, Suspense, ReactNode } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { CandidateRegister } from './pages/CandidateRegister';
import { LandingPage } from './pages/LandingPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { RecruiterLogin } from './pages/RecruiterLogin';
import { RecruiterAccess } from './pages/RecruiterAccess';
import { RecruiterRegister } from './pages/RecruiterRegister';
import { SuperAdminLogin } from './pages/SuperAdminLogin';

// Lazy-loaded persona dashboards for optimized chunk splitting
const CandidateApp = lazy(() => import('./pages/candidate/CandidateApp'));
const HiringManagerApp = lazy(() => import('./pages/hiring-manager/HiringManagerApp'));
const ResourceManagerApp = lazy(() => import('./pages/resource-manager/ResourceManagerApp'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));

// Maps each role to their dashboard route
const roleRedirectMap: Record<string, string> = {
  candidate: '/candidate',
  hiring_manager: '/hiring/dashboard',
  resource_manager: '/resource/dashboard',
  super_admin: '/super-admin/dashboard',
};

// Maps each protected area to its login page
const roleLoginMap: Record<string, string> = {
  super_admin: '/super-admin/login',
  hiring_manager: '/hiring/login',
  resource_manager: '/resource/login',
  candidate: '/login',
};

const PageFallback = ({ isDark = false }: { isDark?: boolean }) => (
  <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
    <div className={`w-8 h-8 rounded-full border-4 animate-spin ${isDark ? 'border-purple-500/20 border-t-purple-500' : 'border-slate-200 border-t-primary-600'}`} />
  </div>
);

const ProtectedRoute = ({ children, allowedRole }: { children: ReactNode, allowedRole: string }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <PageFallback isDark={allowedRole === 'super_admin'} />;
  }

  // Not logged in -> go to the correct login page
  if (!token) {
    return <Navigate to={roleLoginMap[allowedRole] || '/login'} replace />;
  }

  // Logged in check
  if (user) {
    // 1. Role mismatch -> redirect to their own dashboard
    if (user.role !== allowedRole) {
      return <Navigate to={roleRedirectMap[user.role] || '/'} replace />;
    }

    // 2. Status check for Recruiters (HM/RM)
    if (user.role === 'hiring_manager' || user.role === 'resource_manager') {
      if (user.status === 'pending') {
        return <Navigate to={`${roleLoginMap[user.role]}?error=pending_approval`} replace />;
      }
      if (user.status === 'rejected') {
        return <Navigate to={`${roleLoginMap[user.role]}?error=rejected_access`} replace />;
      }
    }
  }

  return <>{children}</>;
};

function LandingRedirect() {
  const { user, token, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');
  
  if (loading) {
    return <PageFallback />;
  }
  
  // If we have a NEW token in the URL, don't redirect yet - let LandingPage process it
  if (urlToken) {
    return <LandingPage />;
  }
  
  if (token && user) {
    if (user.role === 'super_admin') return <Navigate to="/super-admin/dashboard" replace />;
    if (user.role === 'hiring_manager') return <Navigate to="/hiring/dashboard" replace />;
    if (user.role === 'resource_manager') return <Navigate to="/resource/dashboard" replace />;
    if (user.role === 'candidate') return <Navigate to="/candidate" replace />;
  }
  
  return <LandingPage />;
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<CandidateRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/candidate/*" element={<ProtectedRoute allowedRole="candidate"><CandidateApp /></ProtectedRoute>} />
        <Route path="/candidate/dashboard/*" element={<Navigate to="/candidate" replace />} />
        <Route path="/hiring/dashboard/*" element={<ProtectedRoute allowedRole="hiring_manager"><HiringManagerApp /></ProtectedRoute>} />
        <Route path="/resource/dashboard/*" element={<ProtectedRoute allowedRole="resource_manager"><ResourceManagerApp /></ProtectedRoute>} />
        <Route path="/hiring-manager/*" element={<Navigate to="/hiring/dashboard" replace />} />
        <Route path="/resource-manager/*" element={<Navigate to="/resource/dashboard" replace />} />
        <Route path="/hiring/login" element={<RecruiterLogin roleType="hiring_manager" />} />
        <Route path="/resource/login" element={<RecruiterLogin roleType="resource_manager" />} />
        <Route path="/recruiter" element={<RecruiterAccess />} />
        <Route path="/recruiter/register" element={<RecruiterRegister />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
