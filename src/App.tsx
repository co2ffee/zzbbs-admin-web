import { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { useAuth } from './auth'
import { NotifyProvider } from './ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Topics from './pages/Topics'
import Comments from './pages/Comments'
import Files from './pages/Files'
import Tags from './pages/Tags'
import ExchangeProducts from './pages/ExchangeProducts'
import ExchangeOrders from './pages/ExchangeOrders'
import Users from './pages/Users'
import SensitiveWords from './pages/SensitiveWords'
import System from './pages/System'
import AdminUsers from './pages/AdminUsers'
import Roles from './pages/Roles'
import Permissions from './pages/Permissions'

function RequireAuth({ children }: { children: ReactElement }) {
  const { admin } = useAuth()
  return admin ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <NotifyProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/comments" element={<Comments />} />
          <Route path="/files" element={<Files />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/users" element={<Users />} />
          <Route path="/exchange-products" element={<ExchangeProducts />} />
          <Route path="/exchange-orders" element={<ExchangeOrders />} />
          <Route path="/sensitive-words" element={<SensitiveWords />} />
          <Route path="/system" element={<System />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/permissions" element={<Permissions />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotifyProvider>
  )
}
