'use strict';

/**
 * Expose
 */

const port = process.env.PORT || 3000;

module.exports = {
  db: process.env.MONGODB_URL || 'mongodb://localhost:27017/fatbull',
  google: {
    clientID: process.env.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: `http://localhost:3000/auth/google/callback`,
  },
  facebook: {
    clientID: process.env.FACEBOOK_CLIENTID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: `http://localhost:3000/auth/facebook/callback`,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APPPASS,
  },
  verificationlink: process.env.VERIFICATION_LINK,
};
