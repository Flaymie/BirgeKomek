import ProfilePage from './components/pages/ProfilePage';
import CreateRequestPage from './components/pages/CreateRequestPage';
import RequestDetailPage from './components/pages/RequestDetailPage';
import NotificationsPage from './components/pages/NotificationsPage';

          {/* Защищенные маршруты */}
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/create-request" element={<CreateRequestPage />} />
            <Route path="/request/:id" element={<RequestDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route> 