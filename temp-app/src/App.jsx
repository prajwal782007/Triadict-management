import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';

function PlaceholderPage({ title }) {
  return (
    <div className="flex h-full items-center justify-center text-text-muted">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-main mb-2">{title}</h2>
        <p>This section is under construction.</p>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Overview';
      case '/my-work': return 'My Work';
      case '/tasks': return 'Tasks';
      case '/learning-log': return 'Learning Log';
      case '/team-activity': return 'Team Activity';
      case '/settings': return 'Settings';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-sm">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar title={getPageTitle()} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/my-work" element={<PlaceholderPage title="My Work" />} />
              <Route path="/tasks" element={<PlaceholderPage title="Tasks" />} />
              <Route path="/learning-log" element={<PlaceholderPage title="Learning Log" />} />
              <Route path="/team-activity" element={<PlaceholderPage title="Team Activity" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
