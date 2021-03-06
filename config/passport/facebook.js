'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('../');
const User = mongoose.model('User');

/**
 * Expose
 */

module.exports = new FacebookStrategy(
  {
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
  },
  function(accessToken, refreshToken, profile, done) {
    const options = {
      criteria: { 'facebook.id': profile.id }
    };
    User.load(options, function(err, user) {
      if (err) return done(err);
      if (!user) {
        console.log(profile);
        user = new User({
          name: profile.displayName,
          email: '',
          username: profile.username,
          provider: 'facebook',
          google: profile._json
        });
        user.save(function(err) {
          if (err) console.log(err);
          return done(err, user);
        });
      } else {
        return done(err, user);
      }
    });
  }
);
