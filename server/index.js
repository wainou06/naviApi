require('dotenv').config()
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const { User } = require('../models')

module.exports = () => {
   passport.use(
      new GoogleStrategy(
         {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.APP_API_URL}/auth/google/callback`,
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

   passport.serializeUser((user, done) => done(null, user))
   passport.deserializeUser((user, done) => done(null, user))
}
