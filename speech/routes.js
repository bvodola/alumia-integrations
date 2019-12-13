const express = require('express');
const router = express.Router();
const speech = require('./index');

router.post('/test', async (req, res) => {
  try {
    const transcript = await speech(req.body.base64file);
    res.send(transcript);
  } catch (err) {
    console.error('speech/routes.js', err);
    res.send(err).status(500);
  }
});

module.exports = router;
