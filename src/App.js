import Dashboard from './components/Dashboard';
import { TaskProvider } from './context/TaskContext';

function App() {
  return (
    <TaskProvider>
      <Dashboard />
    </TaskProvider>
  );
}

export default App; 