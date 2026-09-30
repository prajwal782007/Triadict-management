import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import MyWork from './pages/MyWork';
import Tasks from './pages/Tasks';
import LearningLog from './pages/LearningLog';
import TeamActivity from './pages/TeamActivity';
import Settings from './pages/Settings';

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
              <Route path="/my-work" element={<MyWork />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/learning-log" element={<LearningLog />} />
              <Route path="/team-activity" element={<TeamActivity />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
