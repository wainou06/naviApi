require('dotenv').config()
const GoogleStrategy = require('passport-google-oauth20').Strategy
const passport = require('passport')
const { User } = require('../models')
passport.use(
   new GoogleStrategy(
      {
         clientID: process.env.GOOGLE_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
         callbackURL: 'http://localhost:8000/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
         try {
            let user = await User.findOne({ where: { googleId: profile.id } })
            if (!user) {
               user = await User.create({
                  googleId: profile.id,
                  email: profile.emails[0].value,
                  name: profile.displayName,
                  nick: profile.displayName,
               })
            }
            return done(null, user)
         } catch (err) {
            console.error('GoogleStrategy error:', err)
            return done(err, null)
         }
      }
   )
)
passport.serializeUser((user, done) => {
   done(null, user)
})
passport.deserializeUser((user, done) => {
   done(null, user)
})
// passport.authenticate('google', {
//    failureRedirect: '/login',
//    session: false,
// })
