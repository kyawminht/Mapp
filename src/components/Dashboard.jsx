import { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import TaskList from './TaskList';
import MessageForm from './MessageForm';
import logo from '../assets/sender.png';
export default function Dashboard() {
  const { state } = useTaskContext();
  const [tasks, setTasks] = useState([{ id: 'default' }]);

  const addNewTask = () => {
    setTasks([...tasks, { id: Date.now().toString() }]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-full" />
            <h1 className="text-2xl font-bold text-gray-900">
              Message Sender</h1>
            </div>
            <button
              onClick={addNewTask}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {tasks.map(task => (
                <MessageForm key={task.id} taskId={task.id} />
              ))}
            </div>
            <div className="sticky top-6">
              <TaskList tasks={state.tasks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 