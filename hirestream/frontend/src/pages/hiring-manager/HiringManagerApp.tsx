import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { HiringManagerAnalytics } from './HiringManagerAnalytics';
import { CandidatePipeline } from './CandidatePipeline';
import { HiringManagerInterviews } from './HiringManagerInterviews';
import { HireRequest } from './HireRequest';
import { HiringManagerRequisitions } from './HiringManagerRequisitions';
import { NotificationsPage } from '../NotificationsPage';
import { SettingsPage } from '../SettingsPage';
import { ProfilePage } from '../ProfilePage';

const HiringManagerApp = () => {
    return (
        <Layout>
            <Routes>
                <Route index element={<HiringManagerAnalytics />} />
                <Route path="requisitions" element={<HiringManagerRequisitions />} />
                <Route path="pipeline" element={<CandidatePipeline />} />
                <Route path="interviews" element={<HiringManagerInterviews />} />
                <Route path="hire-request" element={<HireRequest />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
            </Routes>
        </Layout>
    );
};

export default HiringManagerApp;
