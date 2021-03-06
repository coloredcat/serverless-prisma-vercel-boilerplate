import express from "express";
import passport from "passport";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./_lib/schema";
import { createContext } from "./_lib/context";
import cors from "cors";

export let ALLOWED_ORIGIN: string[];

try {
  ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN!.split(" ");
} catch (err) {
  throw new Error("Please set allowed origins in .env file.");
}

const app = express();

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  })
);

export let secret: string;
try {
  secret = process.env.APP_SECRET!;
} catch (err) {
  throw new Error(
    "Your APP_SECRET variable could not be found. Please set it in your .env file."
  );
}

app.use(require("./_lib/passport/init"));
app.use(require("./_lib/passport/twitter"));

app.use(
  "/api",
  graphqlHTTP(async (req, res) => ({
    schema,
    context: createContext({ req, res }),
    graphiql: true,
  }))
);

export default app;
