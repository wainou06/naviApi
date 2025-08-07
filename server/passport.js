require('dotenv').config()

const GoogleStrategy = require('passport-google-oauth20').Strategy
const passport = require('passport')

const { User } = require('../models')

passport.use(
   new GoogleStrategy(
      {
         clientID: '156386536274-078nmjqmacjhku72ukrigkn8rf2le50v.apps.googleusercontent.com',
         clientSecret: process.env.YOUR_GOOGLE_CLIENT_SECRET,
         callbackURL: 'http://localhost:8000/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
         // console.log('Google profile:', profile)
         // console.log('Access Token:', accessToken)
         try {
            // console.log('Google profile:', profile)
            // console.log('Access Token:', accessToken)

            // console.log(profile)

            let user = await User.findOne({ where: { googleId: profile.id } })

            if (!user) {
               user = await User.create({
                  googleId: profile.id,
                  email: profile.emails[0].value,
                  name: profile.displayName,
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
