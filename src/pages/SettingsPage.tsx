import { useState } from 'react';
import { Save, Bell, Shield, Database, Palette, Globe } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useStore } from '../store/useStore';

interface SettingSection {
  id: string;
  icon: typeof Bell;
  title: string;
  description: string;
}

const sections: SettingSection[] = [
  { id: 'notifications', icon: Bell, title: 'Notifications', description: 'Email and push notification preferences' },
  { id: 'security', icon: Shield, title: 'Security', description: 'Password, 2FA, and session settings' },
  { id: 'integrations', icon: Database, title: 'Integrations', description: 'Connect third-party services' },
  { id: 'appearance', icon: Palette, title: 'Appearance', description: 'Theme and display options' },
  { id: 'general', icon: Globe, title: 'General', description: 'Language, timezone, and formats' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useStore();
  const [activeSection, setActiveSection] = useState('notifications');
  const [notifications, setNotifications] = useState({
    emailPayments: true,
    emailMaintenance: true,
    emailLeases: false,
    pushUrgent: true,
    pushAll: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section nav */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-text-secondary hover:bg-surface-tertiary'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-text-muted truncate hidden sm:block">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 card">
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">Notification Preferences</h2>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Email Notifications</h3>
                {[
                  { key: 'emailPayments' as const, label: 'Payment received/overdue alerts' },
                  { key: 'emailMaintenance' as const, label: 'Maintenance request updates' },
                  { key: 'emailLeases' as const, label: 'Lease expiration reminders' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-primary">{label}</span>
                    <button
                      role="switch"
                      aria-checked={notifications[key]}
                      onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notifications[key] ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                          notifications[key] ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Push Notifications</h3>
                {[
                  { key: 'pushUrgent' as const, label: 'Urgent maintenance requests only' },
                  { key: 'pushAll' as const, label: 'All activity notifications' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-primary">{label}</span>
                    <button
                      role="switch"
                      aria-checked={notifications[key]}
                      onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notifications[key] ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                          notifications[key] ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <button className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
                  <input type="password" className="input max-w-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                  <input type="password" className="input max-w-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                  <input type="password" className="input max-w-md" />
                </div>
              </div>
              <button className="btn-primary">Update Password</button>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">Integrations</h2>
              <p className="text-sm text-text-secondary">Connect external services to enhance your workflow.</p>
              <div className="space-y-3">
                {['QuickBooks', 'Zillow', 'Mailchimp', 'Google Analytics', 'Stripe'].map((service) => (
                  <div key={service} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{service}</p>
                      <p className="text-xs text-text-muted">Sync data with {service}</p>
                    </div>
                    <button className="btn-secondary text-sm py-1.5">Connect</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors capitalize min-h-[44px] ${
                        theme === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-text-secondary hover:bg-surface-tertiary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">General Settings</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Timezone</label>
                  <select className="input">
                    <option>America/Chicago (CST)</option>
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>America/Denver (MST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Date Format</label>
                  <select className="input">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Currency</label>
                  <select className="input">
                    <option>USD ($)</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>CAD</option>
                  </select>
                </div>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
