var express = require('express');
var { registerMiddleware, validateMiddleware } = require('./index');
var router = express.Router();

module.exports = function(passport) {

  router.post('/login',
    passport.authenticate('local'),
    function(req, res) {
      res.send(req.user);
    });

  if(process.env.NODE_ENV !== 'production') {
    router.post('/register',
      (req, res) => registerMiddleware(req, res)
    );
  }

  router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'] }));

  router.get('/facebook/callback',
    passport.authenticate('facebook'),
    function(req, res) {
      const user = req.user.toObject();
      res.cookie('token', user.tokens.local);
      // res.redirect('http://localhost:4000');
      res.redirect('http://4f654ffe.ngrok.io')
    });

  router.get('/twitter',
    passport.authenticate('twitter'));

  router.get('/twitter/callback',
    passport.authenticate('twitter'),
    function(req, res) {
      const user = req.user.toObject();
      res.cookie('token', user.tokens.local);
      res.redirect('http://localhost:4000');
    });

    router.get('/google',
      passport.authenticate('google', { scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.profile.emails.read'
      ]}));

    router.get('/google/callback',
      passport.authenticate('google'),
      function(req, res) {
        const user = req.user.toObject();
        res.cookie('token', user.tokens.local);
        res.redirect('http://localhost:4000');
      });

  return router;
}
