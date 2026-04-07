import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ResourceManagerDashboard } from './ResourceManagerDashboard';
import { ResourceManagerOpenRoles } from './ResourceManagerOpenRoles';
import { ResourceManagerCandidates } from './ResourceManagerCandidates';
import { ResourceManagerApplicants } from './ResourceManagerApplicants';
import { ResourceManagerATS } from './ResourceManagerATS';
import { ResourceManagerInterviews } from './ResourceManagerInterviews';
import { ResourceManagerAdministration } from './ResourceManagerAdministration';
import { NotificationsPage } from '../NotificationsPage';
import { SettingsPage } from '../SettingsPage';
import { ProfilePage } from '../ProfilePage';

const ResourceManagerApp = () => {
    return (
        <Layout>
            <Routes>
                <Route index element={<ResourceManagerDashboard />} />
                <Route path="roles" element={<ResourceManagerOpenRoles />} />
                <Route path="applicants" element={<ResourceManagerApplicants />} />
                <Route path="pipeline" element={<ResourceManagerCandidates />} />
                <Route path="administration" element={<ResourceManagerAdministration />} />
                <Route path="ats" element={<ResourceManagerATS />} />
                <Route path="interviews" element={<ResourceManagerInterviews />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
            </Routes>
        </Layout>
    );
};

export default ResourceManagerApp;
