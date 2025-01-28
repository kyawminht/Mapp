const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Task routes
router.post('/send-messages', taskController.createTask);
router.get('/task/:taskId', taskController.getTaskStatus);
router.get('/tasks', taskController.getAllTasks);
router.post('/task/:taskId/stop', taskController.stopTask);

module.exports = router; 