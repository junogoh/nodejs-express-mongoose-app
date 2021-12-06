'use strict';

/*
 * Module dependencies.
 */

const users = require('../app/controllers/users');
const auth = require('./middlewares/authorization');

/**
 * Route middlewares
 */

const fail = {
  failureRedirect: '/login'
};

/**
 * Expose routes
 */

module.exports = function(app, passport) {
  const pauth = passport.authenticate.bind(passport);

  // user routes
  app.get('/login', users.login);
  app.get('/signup', users.signup);
  app.get('/logout', users.logout);
  app.post('/users', users.create);
  app.post(
    '/users/session',
    pauth('local', {
      failureRedirect: '/login',
      failureFlash: 'Invalid email or password.'
    }),
    users.session
  );
  app.get('/users/verify/:userId', users.verify);
  app.get('/users/activate', users.verify);
  app.get('/users/:userId', users.show);
  app.post('/users/resend', users.resend);
  app.get('/users/resetpassword/:userId', users.showresetpassword);
  app.post('/users/resetpassword', users.resetpassword);
  app.get('/users/success', users.success);
  app.get('/users/failed', users.failed);


  app.get('/auth/facebook', pauth('facebook', fail), users.signin);
  app.get(
    '/auth/facebook/callback',
    pauth('facebook', fail),
    users.authCallback
  );
  app.get(
    '/auth/google',
    pauth('google', {
      failureRedirect: '/login',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    }),
    users.signin
  );
  app.get('/auth/google/callback', pauth('google', fail), users.authCallback);

  app.param('userId', users.load);

  // home route
  app.get('/', users.home);

  /**
   * Error handling
   */

  app.use(function(err, req, res, next) {
    // treat as 404
    if (
      err.message &&
      (~err.message.indexOf('not found') ||
        ~err.message.indexOf('Cast to ObjectId failed'))
    ) {
      return next();
    }

    console.error(err.stack);

    if (err.stack.includes('ValidationError')) {
      res.status(422).render('422', { error: err.stack });
      return;
    }

    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  app.use(function(req, res) {
    const payload = {
      url: req.originalUrl,
      error: 'Not found'
    };
    if (req.accepts('json')) return res.status(404).json(payload);
    res.status(404).render('404', payload);
  });
};
