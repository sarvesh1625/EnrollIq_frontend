import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Public pages
import Login          from './pages/Login'
import SchoolDiscovery from './pages/SchoolDiscovery'
import SuperAdmin     from './pages/SuperAdmin'
import LandingPage    from './pages/LandingPage'

// Protected pages
import Dashboard      from './pages/Dashboard'
import Leads          from './pages/Leads'
import LeadDetail     from './pages/LeadDetail'
import AddLead        from './pages/AddLead'
import Pipeline       from './pages/Pipeline'
import Admissions     from './pages/Admissions'
import Students       from './pages/Students'
import Attendance     from './pages/Attendance'
import Exams          from './pages/Exams'
import Fees           from './pages/Fees'
import Transport      from './pages/Transport'
import Communication  from './pages/Communication'
import Analytics      from './pages/Analytics'
import BulkImport     from './pages/BulkImport'
import RoleManagement from './pages/RoleManagement'
import Settings       from './pages/Settings'
import SchoolProfile  from './pages/SchoolProfile'
import AdsManagement  from './pages/AdsManagement'
import RoleDashboard from './pages/RoleDashboard'
import SchoolKit from './pages/Schoolkit'
import LiveTracking from "./pages/Livetracking";
import Cameras from './pages/Cameras'
import AcademicYear from "./pages/Academicyear";
import DailyUpdates from "./pages/DailyUpdates";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f6f1' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'3px solid #f3f4f6', borderTop:'3px solid #d4521a', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#9ca3af', fontSize:13 }}>Loading EnrollIQ...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"           element={<LandingPage />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/discover"   element={<SchoolDiscovery />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/tracking" element={<LiveTracking />} />
<Route path="/cameras"  element={<Cameras />} />
<Route path="/academic" element={<AcademicYear />} />
<Route path="/daily-updates" element={<DailyUpdates />} />

        {/* Protected — school admin/staff */}
        <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/leads"         element={<PrivateRoute><Leads /></PrivateRoute>} />
        <Route path="/leads/new"     element={<PrivateRoute><AddLead /></PrivateRoute>} />
        <Route path="/leads/:id"     element={<PrivateRoute><LeadDetail /></PrivateRoute>} />
        <Route path="/pipeline"      element={<PrivateRoute><Pipeline /></PrivateRoute>} />
        <Route path="/admissions"    element={<PrivateRoute><Admissions /></PrivateRoute>} />
        <Route path="/students"      element={<PrivateRoute><Students /></PrivateRoute>} />
        <Route path="/attendance"    element={<PrivateRoute><Attendance /></PrivateRoute>} />
        <Route path="/exams"         element={<PrivateRoute><Exams /></PrivateRoute>} />
        <Route path="/fees"          element={<PrivateRoute><Fees /></PrivateRoute>} />
        <Route path="/transport"     element={<PrivateRoute><Transport /></PrivateRoute>} />
        <Route path="/communication" element={<PrivateRoute><Communication /></PrivateRoute>} />
        <Route path="/analytics"     element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/import"        element={<PrivateRoute><BulkImport /></PrivateRoute>} />
        <Route path="/roles"         element={<PrivateRoute><RoleManagement /></PrivateRoute>} />
        <Route path="/settings"      element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/school-profile" element={<PrivateRoute><SchoolProfile /></PrivateRoute>} />
        <Route path="/ads"           element={<PrivateRoute><AdsManagement /></PrivateRoute>} />
        <Route path="/staff-dashboard"           element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
        <Route path="/teacher-dashboard"         element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
        <Route path="/accountant-dashboard"      element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
        <Route path="/receptionist-dashboard"    element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
        <Route path="/transport-dashboard"       element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/kit" element={<SchoolKit />} />
      </Routes>
    </BrowserRouter>
  )
}