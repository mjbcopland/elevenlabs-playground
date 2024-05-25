import morgan = require("morgan");
import express = require("express");
import cors = require("cors");
import proxy = require("express-http-proxy");

const app = express();

app.use(morgan(process.env.NODE_ENV === "production" ? "common" : "dev"));

app.use(cors({ origin: true }));

app.use(
  "/xi",
  proxy("https://api.elevenlabs.io", {
    proxyReqOptDecorator(options) {
      options.headers!["xi-api-key"] = process.env.XI_API_KEY;
      return options;
    },
  })
);

app.listen(8080);
