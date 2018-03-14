const Auth0Strategy = require('passport-auth0');
const { AUTH0_CLIENTID, AUTH0CLIENT_SECRET } = require('./config/env.js');

// Configure Passport to use Auth0
const strategy = new Auth0Strategy(
  {
    domain: 'retail-runner.eu.auth0.com',
    clientID: AUTH0_CLIENTID,
    clientSecret: AUTH0CLIENT_SECRET,
    callbackURL: 'http://localhost:8888/callback'
  },
  (accessToken, refreshToken, extraParams, profile, done) => {
    return done(null, profile);
  }
);

module.exports = strategy;
