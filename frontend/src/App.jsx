import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ApproverRoute  from './components/ApproverRoute'
import Navbar         from './components/Navbar'
import AppToaster     from './components/AppToaster'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Dashboard      from './pages/Dashboard'
import MyReports      from './pages/MyReports'
import CreateReport   from './pages/CreateReport'
import ReportDetail   from './pages/ReportDetail'
import ApproverQueue  from './pages/ApproverQueue'
import AllReports     from './pages/AllReports'

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppToaster />
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard"   element={<Layout><Dashboard /></Layout>} />
            <Route path="/reports"     element={<Layout><MyReports /></Layout>} />
            <Route path="/reports/new" element={<Layout><CreateReport /></Layout>} />
            <Route path="/reports/:id" element={<Layout><ReportDetail /></Layout>} />
          </Route>

          <Route element={<ApproverRoute />}>
            <Route path="/approver/queue" element={<Layout><ApproverQueue /></Layout>} />
            <Route path="/approver/all"   element={<Layout><AllReports /></Layout>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}