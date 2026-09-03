import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm py-1.5 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-white after:transition-transform after:duration-200 ${
          isActive
            ? 'text-white font-medium after:scale-x-100'
            : 'text-white/60 hover:text-white after:scale-x-0 hover:after:scale-x-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = user?.name?.[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const closeOnEscape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-white/10 text-white text-sm font-medium flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#EAECF0] shadow-lg py-1.5 z-50">
          <div className="px-3 py-2 border-b border-[#EAECF0]">
            <p className="text-sm font-medium text-[#101828] truncate">{user?.name}</p>
            <p className="text-xs text-[#667085]">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, isApprover, logout } = useAuth()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (!isApprover) return
    const fetchCount = () => api.get('/alerts/count').then(r => setAlertCount(r.data.data.count)).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [isApprover])

  return (
    <div className=" z-40 px-4 mb-8">
      <nav className="bg-[#101828] rounded-2xl shadow-lg px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
        <div className="flex items-center gap-2">
  <div className="w-7 h-7 rounded-lg bg-white text-[#101828] text-sm font-bold flex items-center justify-center">E</div>
  <span className="font-bold text-white text-base tracking-tight">ExpenseApp</span>
</div>
          <div className="flex items-center gap-9">
            <NavItem to="/dashboard">Dashboard</NavItem>
            <NavItem to="/reports">My Reports</NavItem>
            {isApprover && (
              <>
                <NavItem to="/approver/queue">
                  Queue
                  {alertCount > 0 && (
                    <span className="ml-1.5 bg-white text-[#101828] text-[10px] font-semibold rounded-full px-1.5 py-0.5 align-middle">
                      {alertCount}
                    </span>
                  )}
                </NavItem>
                <NavItem to="/approver/all">All Reports</NavItem>
              </>
            )}
          </div>
        </div>

        <UserMenu user={user} onLogout={logout} />
      </nav>
    </div>
  )
}