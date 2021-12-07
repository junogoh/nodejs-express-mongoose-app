'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const { wrap: async } = require('co');
const User = mongoose.model('User');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const config = require('../../config');

const transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  })
);
/**
 * Load
 */

exports.load = async(function*(req, res, next, _id) {
  const criteria = { _id };
  try {
    req.profile = yield User.load({ criteria });
    if (!req.profile) return next(new Error('User not found'));
  } catch (err) {
    return next(err);
  }
  next();
});


/**
 * Resend
 */
exports.resend = async(function*(req, res) {
  const options = {
    criteria: {
      _id: req.body._id,
      provider: 'local',
    },
    select: 'name username email authToken',
  };
  req.profile = yield User.load(options);

  const mailOptions = {
    from: config.email.user,
    to: req.profile.email,
    subject: 'Please verify account',
    html: `Hello ${req.profile.name}, Thank you for joining here. Please verify your account by clicking the link below
    <a href='${config.verificationlink}/users/activate?activation_key=${req.profile.authToken}'>Verify</a>
    `,
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

/**
 * Create user
 */

exports.create = async(function*(req, res) {
  if (req.body.password !== req.body.confirmpassword) {
    const errors = ['New password does not match confirm password.'];
    res.render('users/signup', {
      title: 'Sign up',
      errors,
      user: req.body,
    });
    return;
  }
  if (
    /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/.test(
      req.body.password
    )
  ) {
    console.log('...');
  } else {
    const errors = [
      'contains at least one lower character',
      'contains at least one upper character ',
      'contains at least one digit character ',
      'contains at least one special character',
      'contains at least 8 characters',
    ];
    res.render('users/signup', {
      title: 'Sign up',
      errors,
      user: req.body,
    });
    return;
  }
  const activationKey = uuidv4();
  const user = new User(req.body);
  user.provider = 'local';
  user.authToken = activationKey;
  try {
    yield user.save();

    const mailOptions = {
      from: config.email.user,
      to: req.body.email,
      subject: 'Please verify account',
      html: `Hello junoinbox, Thank you for joining here. Please verify your account by clicking the link below
      <a href='${config.verificationlink}/users/activate?activation_key=${activationKey}'>Verify</a>
      `,
    };
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    req.logIn(user, err => {
      if (err) req.flash('info', 'Sorry! We are not able to log you in!');
      res.redirect('/');
    });
  } catch (err) {
    const errors = Object.keys(err.errors).map(
      field => err.errors[field].message
    );
    console.log(errors)
    res.render('users/signup', {
      title: 'Sign up',
      errors,
      user
    });
  }
});

/**
 *  Show profile
 */

exports.show = function(req, res) {
  const user = req.profile;

  if (!user.verified && user.provider == 'local') {
    res.render('users/verify', {
      user: user
    });
  } else {
    res.render('users/show', {
      user: user
    });
  }
};

/**
 * Verify
 */
exports.verify = async(function*(req, res) {
  User.findOneAndUpdate(
    { authToken: req.query.activation_key },
    { $set: { verified: true } },
    function (err, doc) {
      if (err) {
        console.log('update document error');
      } else {
        console.log('update document success');
        console.log(doc);
      }
    }
  );

  const options = {
    criteria: {
      authToken: req.query.activation_key,
    },
    select: 'name username email verified',
  };
  req.profile = yield User.load(options);

  if (req.profile.verified) {
    res.render('users/home', {
      user: req.profile,
    });
  } else {
    res.render('users/verify', {
      user: req.profile,
    });
  }
});

/**
 * Reset Password
 */
exports.showresetpassword = function(req, res) {
  const user = req.profile;
  res.render('users/resetpassword', {
    user: user
  });
};

exports.resetpassword = async(function*(req, res) {
  const options = {
    criteria: {
      _id: req.body._id,
      provider: 'local',
    },
    select: 'name username email hashed_password salt',
  };
  try {
    req.profile = yield User.load(options);
    if (req.body.newpassword !== req.body.confirmpassword) {
      const errors = ['New password does not match confirm password.'];
      res.render('users/resetpassword', {
        title: 'Sign up',
        errors,
        user: req.profile,
      });
      return;
    }
    if (
      /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/.test(
        req.body.newpassword
      )
    ) {
      console.log('...');
    } else {
      const errors = [
        'contains at least one lower character',
        'contains at least one upper character ',
        'contains at least one digit character ',
        'contains at least one special character',
        'contains at least 8 characters',
      ];
      res.render('users/resetpassword', {
        title: 'Sign up',
        errors,
        user: req.profile,
      });
      return;
    }
    if (!req.profile.authenticate(req.body.currentpassword)) {
      const errors = ['Invalid current password'];
      res.render('users/resetpassword', {
        title: 'Sign up',
        errors,
        user: req.profile,
      });
      return;
    } else {
      User.findOneAndUpdate(
        { _id: req.profile._id },
        {
          $set: {
            hashed_password: req.profile.encryptPassword(req.body.newpassword),
          },
        },
        function (err, doc) {
          if (err) {
            res.render('users/error');
          } else {
            res.render('users/success');
          }
        }
      );
    }
    // if (!req.profile) return next(new Error('User not found'));
  } catch (err) {
    console.log(err)
    const errors = Object.keys(err.errors).map(
      field => err.errors[field].message
    );

    res.render('users/signup', {
      title: 'Sign up',
      errors,
      user
    });
  }
});

/**
 * Success
 */
exports.success = function(req, res) {
  res.render('/users/success');
};

/**
 * Failed
 */
exports.failed = function(req, res) {
  res.render('/users/failed');
};

/**
 * Home
 */
exports.home = function(req, res) {
  res.render('users/home');
};

exports.signin = function() {};

/**
 * Auth callback
 */

exports.authCallback = login;

/**
 * Show login form
 */

exports.login = function(req, res) {
  res.render('users/login', {
    title: 'Login'
  });
};

/**
 * Show sign up form
 */

exports.signup = function(req, res) {
  res.render('users/signup', {
    title: 'Sign up',
    user: new User()
  });
};

/**
 * Logout
 */

exports.logout = function(req, res) {
  req.logout();
  res.redirect('/login');
};

/**
 * Session
 */

exports.session = login;

/**
 * Login
 */

function login(req, res) {
  const redirectTo = req.session.returnTo ? req.session.returnTo : '/';
  delete req.session.returnTo;
  res.redirect(redirectTo);
}
