import { useTaskContext } from '../context/TaskContext';

export default function TaskList({ tasks }) {
  const { dispatch } = useTaskContext();

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = (taskId) => {
    dispatch({ 
      type: 'DELETE_TASK', 
      payload: taskId 
    });
  };

  const getProgressText = (task) => {
    if (!task.friendIds) return '';
    const total = task.friendIds.split(',').length;
    const current = task.result?.processedCount || 0;
    return `${current}/${total}`;
  };

  const getProgressPercentage = (task) => {
    if (!task.friendIds) return 0;
    const total = task.friendIds.split(',').length;
    const current = task.result?.processedCount || 0;
    return Math.min((current / total) * 100, 100);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Tasks</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border rounded-lg p-4 space-y-2 relative"
          >
            <button
              onClick={() => handleDelete(task.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              title="Delete task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">
                Task ID: {task.id}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(task.timestamp).toLocaleString()}
            </p>
            
            {/* Progress section */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Progress: {getProgressText(task)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(getProgressPercentage(task))}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${getProgressPercentage(task)}%` }}
                ></div>
              </div>
            </div>

            {/* Friends list */}
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Friends ({task.friendIds?.split(',').length || 0}):
              </p>
              <div className="mt-1 text-sm text-gray-600 max-h-20 overflow-y-auto">
                {task.friendIds?.split(',').map((friendId, index) => (
                  <div key={friendId} className="flex items-center space-x-2">
                    <span className={
                      index < (task.result?.processedCount || 0) 
                        ? 'text-green-600' 
                        : task.status === 'running' && index === (task.result?.processedCount || 0)
                          ? 'text-yellow-600'
                          : 'text-gray-500'
                    }>
                      • {friendId.trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 