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
            <p className="text-sm text-gray-500">
              Friends: {task.friendIds}
            </p>
            {task.result && (
              <p className="text-sm text-gray-500">
                Processed: {task.result.processedCount} / {task.result.totalCount}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 