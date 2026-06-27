// File: web/src/pages/controltower/ControlTowerDashboard.tsx
// Redesigned to match the premium 'Mission Control' mockup

import React, { useState, useEffect } from 'react';
import DashboardTab from './DashboardTab';
import OperationsTab from './OperationsTab'; // Labeled as 'Reports' (TAT & Operational stats)
import PartnersTab from './PartnersTab';     // 'Referral Partners'
import SourcesTab from './SourcesTab';       // Labeled as 'Customers'
import DemographicsTab from './DemographicsTab';
import WhatsAppManagerTab from './WhatsAppManagerTab';
import SettingsTab from './SettingsTab';

const ControlTowerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Live IST Clock and Date
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };

      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', options) + ' IST');
      setCurrentDate(now.toLocaleDateString('en-US', dateOptions));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
    { id: 'referral-partners', label: 'Referral Partners', icon: '👥' },
    { id: 'customers', label: 'Customers', icon: '👤' },
    { id: 'demographics', label: 'Demographics', icon: '📊' },
    { id: 'whatsapp-manager', label: 'WhatsApp Manager', icon: '💬' },
    { id: 'content-library', label: 'Content Library', icon: '📄', locked: true },
    { id: 'campaigns', label: 'Campaigns', icon: '🎯', locked: true },
    { id: 'reports', label: 'Reports', icon: '📉' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'referral-partners':
        return <PartnersTab />;
      case 'customers':
        return <SourcesTab />;
      case 'demographics':
        return <DemographicsTab />;
      case 'whatsapp-manager':
        return <WhatsAppManagerTab />;
      case 'reports':
        return <OperationsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'content-library':
      case 'campaigns':
        return (
          <div className="flex flex-col items-center justify-center h-96 border border-dashed border-cardBorder rounded-xl bg-cardBg/30 text-center p-8">
            <span className="text-4xl mb-4">🔒</span>
            <h3 className="text-lg font-bold font-display text-white mb-2">Module Locked</h3>
            <p className="text-sm text-textSecondary max-w-sm">
              This intelligence capability is currently offline. Connect to sync engines to activate.
            </p>
          </div>
        );
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-white font-sans overflow-hidden tech-grid relative">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-brandPrimary/10 rounded-full blur-[120px] pointer-events-none pulsing-glow"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-accentCyan/5 rounded-full blur-[100px] pointer-events-none pulsing-glow"></div>

      {/* Sidebar */}
      <aside className="w-64 bg-[#080b18]/85 backdrop-blur-md border-r border-cardBorder flex flex-col justify-between select-none z-10">
        <div>
          {/* Logo container */}
          <div className="p-6 border-b border-cardBorder flex items-center space-x-3 bg-cardBg/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brandPrimary to-brandSecondary flex items-center justify-center font-bold text-white shadow-neon-purple font-display">
              TB
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider font-display text-white">TBZ LABS</h1>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-semibold">Control Tower</p>
            </div>
          </div>

          {/* Active Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                disabled={item.locked && activeTab !== item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-brandSecondary/25 to-brandPrimary/10 text-white border-l-2 border-brandPrimary shadow-card-glow font-semibold' 
                    : item.locked 
                      ? 'text-textMuted opacity-50 cursor-not-allowed'
                      : 'text-textSecondary hover:bg-cardBg/45 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-base ${activeTab === item.id ? 'text-brandPrimary' : 'text-textSecondary'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.locked && (
                  <span className="text-[9px] bg-background border border-cardBorder text-textMuted px-1.5 py-0.5 rounded font-bold uppercase">Lock</span>
                )}
                {activeTab === item.id && !item.locked && (
                  <span className="text-textSecondary text-xs">›</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile Section at bottom of sidebar */}
        <div className="p-4 border-t border-cardBorder bg-[#080b18]/90">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brandSecondary to-brandPrimary flex items-center justify-center font-bold text-white text-base shadow-neon-purple font-display border border-brandPrimary/30">
                T
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight font-display">Tabrez</p>
                <p className="text-xs text-textSecondary">Founder</p>
              </div>
            </div>
            <button className="text-textSecondary hover:text-white transition-colors p-1.5 hover:bg-cardBg/40 rounded-lg">
              ⚙️
            </button>
          </div>
          
          {/* System Health */}
          <div className="p-3 bg-cardBg/40 border border-cardBorder rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold">System Health</p>
              <p className="text-xs font-bold text-success flex items-center mt-0.5">
                <span className="w-2.5 h-2.5 bg-success rounded-full mr-1.5 animate-pulse"></span>
                Excellent
              </p>
            </div>
            <span className="text-[9px] bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-bold">Live</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden z-10 bg-[#060814]/40">
        {/* Workspace Header */}
        <header className="h-20 border-b border-cardBorder bg-background/50 backdrop-blur-md flex items-center justify-between px-8">
          <div>
            <h2 className="text-2xl font-bold font-display text-white tracking-tight flex items-center">
              MISSION CONTROL
            </h2>
            <p className="text-xs text-textSecondary mt-0.5">Real-time intelligence from Divya Diagnostics</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Calendar widget */}
            <div className="bg-cardBg border border-cardBorder px-4 py-2 rounded-xl flex items-center space-x-2">
              <span className="text-brandPrimary">📅</span>
              <span className="text-xs font-medium text-textSecondary">{currentDate || 'Loading...'}</span>
            </div>

            {/* Time widget */}
            <div className="bg-cardBg border border-cardBorder px-4 py-2 rounded-xl flex items-center space-x-2">
              <span className="text-accentCyan">🕒</span>
              <span className="text-xs font-mono font-bold text-white">{currentTime || '00:00 IST'}</span>
            </div>

            {/* Projection status */}
            <div className="bg-cardBg border border-cardBorder px-4 py-2 rounded-xl flex items-center space-x-3">
              <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
              <div className="text-left">
                <p className="text-[9px] text-textMuted uppercase font-bold tracking-wider leading-none">Projection Status</p>
                <p className="text-xs font-bold text-success mt-0.5">Healthy</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Viewport */}
        <section className="flex-1 overflow-y-auto p-8">
          {renderTabContent()}
        </section>
      </main>
    </div>
  );
};

export default ControlTowerDashboard;
