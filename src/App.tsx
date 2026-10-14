import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { HashRouter } from 'react-router-dom'
import { AdminLayout, AdminLogin, AnalyticsPage, CastingBoard, CastingForm, CastingList, ChannelPage, ModelProfilePage, ModelsPage, SettingsPage } from './pages/admin/screens'
import { Hub } from './pages/Hub'
import {
  AppsPage,
  CalendarPage,
  CastingPage,
  Feed,
  InboxPage,
  LoginPage,
  MediaPage,
  ParentLayout,
  PhoneFrame,
  ProfilePage,
  RequireParent,
} from './pages/parent/screens'
import { SharePage } from './pages/SharePage'
import { StoreProvider } from './store'
import { initTelegram, isTelegram } from './telegram'

function Boot() {
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const app = initTelegram()
    const start = app?.initDataUnsafe?.start_param
    const hash = window.location.hash.replace(/^#/, '') || '/'
    if (start) navigate(`/app/castings/${start}`, { replace: true })
    else if (isTelegram() && (hash === '/' || hash === '')) navigate('/app', { replace: true })
  }, [navigate])

  return null
}

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Boot />
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/c/:id" element={<SharePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="castings" replace />} />
            <Route path="castings" element={<CastingList />} />
            <Route path="castings/new" element={<CastingForm />} />
            <Route path="castings/:id/edit" element={<CastingForm />} />
            <Route path="castings/:id" element={<CastingBoard />} />
            <Route path="models/:id" element={<ModelProfilePage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="channel" element={<ChannelPage />} />
          </Route>
          <Route element={<PhoneFrame />}>
            <Route path="/app/login" element={<LoginPage />} />
            <Route element={<RequireParent />}>
              <Route element={<ParentLayout />}>
                <Route path="/app" element={<Feed />} />
                <Route path="/app/castings/:id" element={<CastingPage />} />
                <Route path="/app/applications" element={<AppsPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
                <Route path="/app/media" element={<MediaPage />} />
                <Route path="/app/calendar" element={<CalendarPage />} />
                <Route path="/app/inbox" element={<InboxPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
