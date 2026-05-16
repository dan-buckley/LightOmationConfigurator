import { NavLink, Outlet, Route, Routes } from 'react-router-dom';

import { ConnectionStatus } from './components/ConnectionStatus';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExportPage } from './pages/ExportPage';
import { GeneratePage } from './pages/GeneratePage';
import { HistoryPage } from './pages/HistoryPage';
import { ImportPage } from './pages/ImportPage';
import { LightsPage } from './pages/LightsPage';
import { NetworkPage } from './pages/NetworkPage';
import { PresetsPage } from './pages/PresetsPage';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Lights', to: '/lights' },
  { label: 'Import', to: '/import' },
  { label: 'Preset Library', to: '/presets' },
  { label: 'Assignments', to: '/assignments' },
  { label: 'Generate', to: '/generate' },
  { label: 'Export', to: '/export' },
  { label: 'Network', to: '/network' },
  { label: 'History', to: '/history' },
] as const;

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <span className="text-base font-bold text-gray-900">LightOmation</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_ITEMS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 px-4 py-3">
          <ConnectionStatus />
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="lights" element={<LightsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="presets" element={<PresetsPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="network" element={<NetworkPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
    </Routes>
  );
}
