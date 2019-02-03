import dbSession = require("connect-mongodb-session");
import express = require("express");
import session = require("express-session");
import moment = require("moment");

import { probablyUniqueString } from "../common/Toolbox";

export default async function(
  app: express.Application,
  dbConnectionString?: string
) {
  const MongoDBStore = dbSession(session);
  let store = null;

  if (dbConnectionString) {
    store = new MongoDBStore({
      uri: dbConnectionString,
      collection: "sessions"
    });
  }

  const cookie = {
    maxAge: moment.duration(1, "weeks").asMilliseconds()
  };

  app.use(
    session({
      store: store || undefined,
      secret: process.env.SESSION_SECRET || probablyUniqueString(),
      resave: false,
      saveUninitialized: false,
      cookie
    })
  );
}
