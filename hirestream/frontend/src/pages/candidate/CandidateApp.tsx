import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { CandidateDashboard } from './CandidateDashboard';
import { CandidateFindJobs } from './CandidateFindJobs';
import { CandidateApplications } from './CandidateApplications';
import { CandidateAssessments } from './CandidateAssessments';
import { CandidateSettingsPage } from './CandidateSettingsPage';
import { CandidateNotifications } from './CandidateNotifications';
import { CandidateOnboarding } from './CandidateOnboarding';

const CandidateApp = () => {

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<CandidateDashboard />} />
                <Route path="/jobs" element={<CandidateFindJobs />} />
                <Route path="/applications" element={<CandidateApplications />} />
                <Route path="/assessments" element={<CandidateAssessments />} />
                <Route path="/settings" element={<CandidateSettingsPage />} />
                <Route path="/onboarding" element={<CandidateOnboarding />} />
                <Route path="/notifications" element={<CandidateNotifications />} />
            </Routes>
        </Layout>
    );
};

export default CandidateApp;
