import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function ApproverRoute() {
  const { user, isApprover } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (!isApprover) return <Navigate to="/dashboard" />
  return <Outlet />
}