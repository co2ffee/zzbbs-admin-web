import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ArticleIcon from '@mui/icons-material/Article'
import CommentIcon from '@mui/icons-material/Comment'
import FolderIcon from '@mui/icons-material/Folder'
import LabelIcon from '@mui/icons-material/Label'
import PeopleIcon from '@mui/icons-material/People'
import BlockIcon from '@mui/icons-material/Block'
import SettingsIcon from '@mui/icons-material/Settings'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import GroupsIcon from '@mui/icons-material/Groups'
import KeyIcon from '@mui/icons-material/Key'
import { useAuth } from './auth'

const W = 208
export const NAV = [
  ['/', '仪表盘', <DashboardIcon />],
  ['/topics', '话题管理', <ArticleIcon />],
  ['/comments', '评论管理', <CommentIcon />],
  ['/files', '文件管理', <FolderIcon />],
  ['/tags', '标签管理', <LabelIcon />],
  ['/users', '用户管理', <PeopleIcon />],
  ['/sensitive-words', '敏感词管理', <BlockIcon />],
  ['/system', '系统设置', <SettingsIcon />],
  ['/admin-users', '后台用户', <AdminPanelSettingsIcon />],
  ['/roles', '角色管理', <GroupsIcon />],
  ['/permissions', '权限管理', <KeyIcon />],
] as const

export default function Layout() {
  const { admin, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>PyBBS 后台管理</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{admin?.username}</Typography>
          <Button color="inherit" onClick={() => { logout(); nav('/login') }}>退出</Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: W, '& .MuiDrawer-paper': { width: W, boxSizing: 'border-box' } }}>
        <Toolbar />
        <List>
          {NAV.map(([to, label, icon]) => (
            <ListItemButton key={to} component={RouterLink} to={to}
              selected={to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)}>
              <ListItemIcon>{icon}</ListItemIcon><ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flex: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
