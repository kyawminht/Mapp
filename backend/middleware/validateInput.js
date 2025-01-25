function validateInput(req, res, next) {
  const { cookies, friendIds, message } = req.body;

  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.status(400).json({ error: 'Invalid cookies format' });
  }

  if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
    return res.status(400).json({ error: 'Invalid friendIds format' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  next();
}

module.exports = validateInput; 