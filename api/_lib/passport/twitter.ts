import express, { RequestHandler } from "express";
import { sign } from "jsonwebtoken";
import passport from "passport";
import { Strategy } from "passport-twitter";
import { prisma } from "../context";
import { BasePassportUserInterface } from "./init";

export interface TwitterProfileInterface extends BasePassportUserInterface {
  provider: "twitter";
  _json: {
    id: number;
    name: string;
    screen_name: string;
    url: string;
    verified: boolean;
    profile_image_url_https: string;
  };
}

const app = (module.exports = express());
passport.use(
  new Strategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY!,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
      callbackURL: `${process.env.VERCEL_URL ? "https://" : "http://"}${
        process.env.VERCEL_URL || "localhost:3000"
      }/api/auth/twitter/callback`,
    },
    async (_token, _tokenSecret, profile, done) => {
      console.log("Thank you for logging in", profile.displayName);

      // Unfortunately we can't use upsert because our twitter id is not unique
      // So we first find the user and then act depending on if we find it or not
      // This could probably be converted to fairly clean SQL
      let user;
      try {
        user = await prisma.user.findFirst({
          where: {
            platformId: profile.id,
            provider: "twitter",
          },
        });
      } catch (err) {
        console.log(err);
      }

      if (user) {
        await prisma.user.update({
          where: {
            id: user?.id,
          },
          data: {
            username: profile.username,
            photo: profile.photos?.[0].value,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: profile.username,
            provider: "twitter",
            platformId: profile.id,
            photo: profile.photos?.[0].value,
          },
        });
      }

      return done(null, profile);
    }
  )
);

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj: any, cb) {
  cb(null, obj);
});

app.get(
  "/api/auth/twitter/callback",
  passport.authenticate("twitter", {
    // I first redirect to /api/redirect so we can create some httpOnly cookies, from there we then redirect to the front-end
    successRedirect: "/api/redirect",
    // Failure should probably redirect to your frontend login screen
    failureRedirect: "/login",
  })
);

// Make sure to end your handler with next()
const handler: RequestHandler = (req, res, next) => {
  next();
};

// You can add more handlers in the array before passport to add more logic to your auth
app.use("/api/auth/twitter", [handler, passport.authenticate("twitter")]);
