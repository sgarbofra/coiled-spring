const express = require('express');
const authService = require('../services/auth-service');
const requireAuth = require('../middleware/require-auth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);

    const user = authService.register(req.body);

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log('REGISTER ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/login', (req, res) => {
  try {
    console.log('LOGIN BODY:', req.body);

    const user = authService.login(req.body);
    console.log('LOGIN USER:', user);

    if (!req.session) {
      console.log('NO SESSION OBJECT');
      return res.status(500).json({
        success: false,
        error: 'Session not initialized',
      });
    }

    req.session.userId = user.id;

    req.session.save((error) => {
      if (error) {
        console.log('SESSION SAVE ERROR:', error);
        return res.status(500).json({
          success: false,
          error: 'Unable to save session',
        });
      }

      console.log('SESSION AFTER LOGIN:', req.session);

      return res.status(200).json({
        success: true,
        user,
      });
    });
  } catch (error) {
    console.log('LOGIN ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/logout', (req, res) => {
  try {
    if (!req.session) {
      return res.status(200).json({
        success: true,
      });
    }

    req.session.destroy((error) => {
      if (error) {
        console.log('LOGOUT ERROR:', error);

        return res.status(400).json({
          success: false,
          error: 'Unable to log out',
        });
      }

      res.clearCookie('connect.sid');

      return res.status(200).json({
        success: true,
      });
    });
  } catch (error) {
    console.log('LOGOUT ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.get('/me', requireAuth, (req, res) => {
  try {
    const user = authService.getCurrentUser(req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log('ME ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;