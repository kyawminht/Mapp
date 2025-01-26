import { useState, useRef } from 'react';
import { useTaskContext } from '../context/TaskContext';

export default function MessageForm({ taskId }) {
  const { dispatch } = useTaskContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cookies: '',
    friendIds: '',
    message: ''
  });
  const [logs, setLogs] = useState([]);
  const pollIntervalRef = useRef(null);

  const stopTask = async () => {
    try {
      await fetch(`http://localhost:3001/api/task/${taskId}/stop`, {
        method: 'POST'
      });
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error stopping task:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLogs([]); // Clear previous logs

    try {
      const response = await fetch('http://localhost:3001/api/send-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          cookies: JSON.parse(formData.cookies),
          friendIds: formData.friendIds.split(',').map(id => id.trim()),
          message: formData.message
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        dispatch({
          type: 'ADD_TASK',
          payload: {
            id: data.taskId,
            status: 'running',
            timestamp: new Date().toISOString(),
            ...formData
          }
        });

        // Start polling for task status and logs
        pollIntervalRef.current = setInterval(async () => {
          const statusResponse = await fetch(`http://localhost:3001/api/task/${data.taskId}`);
          const statusData = await statusResponse.json();
          
          // Update task state
          dispatch({
            type: 'UPDATE_TASK',
            payload: {
              id: data.taskId,
              status: statusData.status,
              result: statusData.result,
              logs: statusData.logs,
              friendIds: formData.friendIds // Store friend IDs in task
            }
          });

          setLogs(statusData.logs);
          
          if (statusData.status === 'completed' || statusData.status === 'failed' || statusData.status === 'stopped') {
            clearInterval(pollIntervalRef.current);
            setIsLoading(false);
          }
        }, 1000); // Poll every second instead of 2 seconds
      } else {
        throw new Error(data.error || 'Failed to send messages');
      }
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cookies (JSON format)
          </label>
          <textarea
            required
            className="mt-1 block w-full bg-white rounded-md shadow-sm focus:outline-none border border-gray-300 p-3"
            rows={4}
            value={formData.cookies}
            onChange={(e) => setFormData({ ...formData, cookies: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Friend IDs (comma-separated)
          </label>
          <textarea
            required
              className="mt-1 block w-full bg-white rounded-md border-gray-300 shadow-sm focus:outline-none border p-3"
            value={formData.friendIds}
            onChange={(e) => setFormData({ ...formData, friendIds: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            required
            className="mt-1 block bg-white w-full rounded-md border-gray-300 shadow-sm focus:outline-none border p-3"
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </div>

        <div className="mt-4 flex justify-end space-x-4">
          {isLoading && (
            <button
              type="button"
              onClick={stopTask}
              className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Stop Task
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Processing...' : 'Send Messages'}
          </button>
        </div>
      </form>

      {logs.length > 0 && (
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 