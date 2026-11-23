import React from 'react';
import { DisciviumProvider, useDiscivium } from './context/DisciviumContext';
import { LoginScreen } from './components/LoginScreen';
import { AppShell } from './components/AppShell';
import { StudentPortal } from './components/StudentPortal';
import { LecturerPortal } from './components/LecturerPortal';
import { AdminPortal } from './components/AdminPortal';
import { AdvisorPortal } from './components/AdvisorPortal';
import { ScholarPassportView } from './components/ScholarPassportView';
import { WorkspaceHub } from './components/WorkspaceHub';
import { AppearanceView } from './components/AppearanceView';

function PortalRouter() {
  const { user, activeTab } = useDiscivium();

  if (!user) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    if (activeTab === 'appearance') return <AppearanceView />;
    if (activeTab === 'workspace') return <WorkspaceHub />;
    if (activeTab === 'passport') return <ScholarPassportView />;

    switch (user.role) {
      case 'student':
        return <StudentPortal />;
      case 'lecturer':
        return <LecturerPortal />;
      case 'admin':
        return <AdminPortal />;
      case 'advisor':
        return <AdvisorPortal />;
      default:
        return <StudentPortal />;
    }
  };

  return <AppShell>{renderContent()}</AppShell>;
}

export default function App() {
  return (
    <DisciviumProvider>
      <PortalRouter />
    </DisciviumProvider>
  );
}
