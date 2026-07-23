import { Routes, Route, Outlet } from 'react-router-dom';
import { AppStateProvider } from './state/AppState.jsx';
import { AdminStateProvider } from './state/AdminState.jsx';
import ThemeStyleInjector from './components/ThemeStyleInjector.jsx';
import GuestLayout from './components/GuestLayout.jsx';

import Entrance from './screens/Entrance.jsx';
import OnboardingFlow from './screens/onboarding/OnboardingFlow.jsx';
import Dashboard from './screens/Dashboard.jsx';
import ScavengerHunt from './screens/ScavengerHunt.jsx';
import ChallengeDetail from './screens/ChallengeDetail.jsx';
import PointsProgress from './screens/PointsProgress.jsx';
import RaffleEntries from './screens/RaffleEntries.jsx';
import MoreMenu from './screens/MoreMenu.jsx';
import Profile from './screens/more/Profile.jsx';
import Schedule from './screens/more/Schedule.jsx';
import EventMap from './screens/more/EventMap.jsx';
import Vendors from './screens/more/Vendors.jsx';
import Announcements from './screens/more/Announcements.jsx';
import UnlockedSurprises from './screens/more/UnlockedSurprises.jsx';
import Leaderboard from './screens/more/Leaderboard.jsx';
import Prizes from './screens/more/Prizes.jsx';

import AdminLogin from './screens/admin/AdminLogin.jsx';
import AdminLayout from './screens/admin/AdminLayout.jsx';
import AdminOverview from './screens/admin/AdminOverview.jsx';
import AdminGuests from './screens/admin/AdminGuests.jsx';
import AdminChallenges from './screens/admin/AdminChallenges.jsx';
import AdminVendors from './screens/admin/AdminVendors.jsx';
import AdminSchedule from './screens/admin/AdminSchedule.jsx';
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
        <Route path="/onboarding" element={<OnboardingFlow />} />

        <Route element={<GuestLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hunt" element={<ScavengerHunt />} />
          <Route path="/hunt/:challengeId" element={<ChallengeDetail />} />
          <Route path="/progress" element={<PointsProgress />} />
          <Route path="/raffle" element={<RaffleEntries />} />
          <Route path="/more" element={<MoreMenu />} />
          <Route path="/more/profile" element={<Profile />} />
          <Route path="/more/schedule" element={<Schedule />} />
          <Route path="/more/map" element={<EventMap />} />
          <Route path="/more/vendors" element={<Vendors />} />
          <Route path="/more/announcements" element={<Announcements />} />
          <Route path="/more/surprises" element={<UnlockedSurprises />} />
          <Route path="/more/leaderboard" element={<Leaderboard />} />
          <Route path="/more/prizes" element={<Prizes />} />
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
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="prizes" element={<AdminPrizes />} />
            <Route path="raffle" element={<AdminRaffle />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </AppStateProvider>
  );
}
