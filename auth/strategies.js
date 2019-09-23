var { Users, Companies } = require('../models');
var LocalStrategy = require('passport-local').Strategy;
var { register } = require('./index');

// var FacebookStrategy = require('passport-facebook').Strategy;
// var TwitterStrategy = require('passport-twitter').Strategy;
// var GoogleStrategy = require('passport-google-oauth20').Strategy;

// ====
// Auth
// ====

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user._id || user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  // =====
  // Local
  // =====
  passport.use(new LocalStrategy({
  		usernameField: 'email'
  	},
    function(email, password, done) {
      Users.findOne({ email }, function (err, user) {

        if(user) user = user.toObject();
        const userModel = new Users(user);

        if (err) { return done(err); }
        if (!user) {
          console.log('Incorrect username')
          return done(null, false, { message: 'Incorrect username.' });
        }
        if (!userModel.validPassword(password)) {
          console.log('Incorrect password')
          return done(null, false, { message: 'Incorrect password.' });
        }

        Companies.findOne({ _id: user.company_id }, function (err, company) {
          if(company) {
            user.company = company.toObject();
            delete user.company_id;
          }
          return done(null, user);
        });

      });
    }
  ));

//   // ========
//   // Facebook
//   // ========
//   passport.use(new FacebookStrategy(
//     {
//       clientID: '123947318298079',
//       clientSecret: '7c24f46ffea1c5be66aa4b8e05a8911d',
//       callbackURL: "http://4f654ffe.ngrok.io/auth/facebook/callback",
//       profileFields: ['id', 'emails', 'name']
//     },
//     function(accessToken, refreshToken, profile, cb) {
//       const fbUser = {
//         name: profile.name,
//         email: profile.emails[0].value,
//         services: {
//           facebook: [
//             {
//               id: profile.id,
//               accessToken,
//               refreshToken
//             }
//           ]
//         }
//       };

//       Users.findOne({ email: fbUser.email }, async function (err, user) {
//         if (err) { return done(err); }
//         if (!user) {
//           user = await register(fbUser);
//           return cb(err, user);
//         } else {
//           return cb(err, user);
//         }

//       });
//     }
//   ));

//   // =======
//   // Twitter
//   // =======
//   passport.use(new TwitterStrategy({
//       consumerKey: 'fL4jVmZhz8UfxWomyMRbF4UDp',
//       consumerSecret: 'CzVr3XuMvm6pMc5ac5ly6wLtORpGRZfV8waVHdIa1a5HN0He7i',
//       callbackURL: "http://localhost:3000/auth/twitter/callback"
//     },
//     function(token, tokenSecret, profile, done) {
//       const twitterUser = {
//         services: {
//           twitter: [
//             {
//               id: profile.id,
//               username: profile.username,
//               token,
//               tokenSecret
//             }
//           ]
//         }
//       }

//       Users.findOne({ 'services.twitter.id': twitterUser.services.twitter[0].id }, async function (err, user) {
//         if (err) { return done(err); }
//         if (!user) {
//           user = await register(twitterUser);
//           return done(err, user);
//         } else {
//           return done(err, user);
//         }

//       });

//     }

//   ));

//   // ======
//   // Google
//   // ======
//   passport.use(new GoogleStrategy({
//       clientID: '91860760724-teieu2bcja7voosvhvsuog6tpt2rt6ff.apps.googleusercontent.com',
//       clientSecret: 'AX5-QGmsbw1dsgtXjJh_9EYH',
//       callbackURL: "http://localhost:3000/auth/google/callback"
//     },
//     function(accessToken, refreshToken, profile, done) {
//       const googleUser = {
//         name: profile.displayName,
//         email: profile.emails[0].value,
//         services: {
//           google: [
//             {
//               id: profile.id,
//               username: profile.username,
//               accessToken,
//               refreshToken
//             }
//           ]
//         }
//       }

//       Users.findOne({ 'email': googleUser.email }, async function (err, user) {
//         if (err) { return done(err); }
//         if (!user) {
//           user = await register(googleUser);
//           return done(err, user);
//         } else {
//           return done(err, user);
//         }

//       });

//     }

//   ));

}
