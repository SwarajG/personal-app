import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

// Configure Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Please use Google login for this account.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (user) {
          return done(null, user);
        }

        // Check if user with email exists
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // Link Google account to existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value,
              },
            });
            return done(null, user);
          }
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: email || '',
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        googleId: true,
        createdAt: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
