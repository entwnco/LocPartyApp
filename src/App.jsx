import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AppStateProvider } from './state/AppState.jsx';
import { AdminStateProvider } from './state/AdminState.jsx';
import ThemeStyleInjector from './components/ThemeStyleInjector.jsx';
import GuestLayout from './components/GuestLayout.jsx';

import Entrance from './screens/Entrance.jsx';
import Login from './screens/Login.jsx';
import ResetPassword from './screens/ResetPassword.jsx';
import OnboardingFlow from './screens/onboarding/OnboardingFlow.jsx';
import Dashboard from './screens/Dashboard.jsx';
import BingoBoard from './screens/BingoBoard.jsx';
import PointsProgress from './screens/PointsProgress.jsx';
import RaffleEntries from './screens/RaffleEntries.jsx';
import MoreMenu from './screens/MoreMenu.jsx';
import Profile from './screens/more/Profile.jsx';
import Schedule from './screens/more/Schedule.jsx';
import Venue from './screens/Venue.jsx';
import EventMap from './screens/more/EventMap.jsx';
import Vendors from './screens/more/Vendors.jsx';
import Sponsors from './screens/more/Sponsors.jsx';
import Announcements from './screens/more/Announcements.jsx';
import Leaderboard from './screens/more/Leaderboard.jsx';
import Redeem from './screens/more/Redeem.jsx';
import NotFound from './screens/NotFound.jsx';

import AdminLogin from './screens/admin/AdminLogin.jsx';
import AdminLayout from './screens/admin/AdminLayout.jsx';
import AdminOverview from './screens/admin/AdminOverview.jsx';
import AdminGuests from './screens/admin/AdminGuests.jsx';
import AdminRedeem from './screens/admin/AdminRedeem.jsx';
import AdminBingo from './screens/admin/AdminBingo.jsx';
import AdminCodes from './screens/admin/AdminCodes.jsx';
import AdminChallenges from './screens/admin/AdminChallenges.jsx';
import AdminVendors from './screens/admin/AdminVendors.jsx';
import AdminSchedule from './screens/admin/AdminSchedule.jsx';
import AdminVenue from './screens/admin/AdminVenue.jsx';
import AdminAnnouncements from './screens/admin/AdminAnnouncements.jsx';
import AdminPrizes from './screens/admin/AdminPrizes.jsx';
import AdminRaffle from './screens/admin/AdminRaffle.jsx';
import AdminSubmissions from './screens/admin/AdminSubmissions.jsx';
import AdminSettings from './screens/admin/AdminSettings.jsx';

export default function App() {
  return (
    <AppStateProvider>
      <ThemeStyleInjector />
      <Routes>
        <Route path="/" element={<Entrance />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />

        <Route element={<GuestLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/venue" element={<Venue />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/bingo/:squareId?" element={<BingoBoard />} />
          <Route path="/vendors" element={<Navigate to="/more/vendors" replace />} />
          <Route path="/hunt" element={<Navigate to="/dashboard" replace />} />
          <Route path="/hunt/:challengeId" element={<Navigate to="/dashboard" replace />} />
          <Route path="/progress" element={<Navigate to="/more/progress" replace />} />
          <Route path="/raffle" element={<Navigate to="/more/raffle" replace />} />
          <Route path="/more" element={<MoreMenu />} />
          <Route path="/more/profile" element={<Profile />} />
          <Route path="/more/progress" element={<PointsProgress />} />
          <Route path="/more/redeem" element={<Redeem />} />
          <Route path="/more/raffle" element={<RaffleEntries />} />
          <Route path="/more/schedule" element={<Navigate to="/schedule" replace />} />
          <Route path="/more/map" element={<EventMap />} />
          <Route path="/more/vendors" element={<Vendors />} />
          <Route path="/more/sponsors" element={<Sponsors />} />
          <Route path="/more/announcements" element={<Navigate to="/announcements" replace />} />
          <Route path="/more/surprises" element={<Navigate to="/more" replace />} />
          <Route path="/more/leaderboard" element={<Leaderboard />} />
          <Route path="/more/prizes" element={<Navigate to="/more" replace />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminStateProvider>
              <Outlet />
            </AdminStateProvider>
          }
        >
          <Route index element={<AdminLogin />} />
          <Route element={<AdminLayout />}>
            <Route path="overview" element={<AdminOverview />} />
            <Route path="guests" element={<AdminGuests />} />
            <Route path="redeem" element={<AdminRedeem />} />
            <Route path="bingo" element={<AdminBingo />} />
            <Route path="codes" element={<AdminCodes />} />
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="venue" element={<AdminVenue />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="prizes" element={<AdminPrizes />} />
            <Route path="raffle" element={<AdminRaffle />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppStateProvider>
  );
}
