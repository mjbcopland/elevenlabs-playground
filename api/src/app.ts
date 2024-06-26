import morgan = require("morgan");
import express = require("express");
import cors = require("cors");
import proxy = require("express-http-proxy");

const app = express();
export default app;

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(cors({ origin: true }));

import * as fs from "node:fs/promises";
import * as path from "node:path";
app.post("/xi/snapshot", (req, res) => {
  Promise.resolve().then(async () => {
    const filepath = path.resolve(__dirname, "./snapshot-sam.json");
    const file = await fs.readFile(filepath, { encoding: "utf-8" });

    res.setHeader("content-type", "application/ndjson");

    for (const chunk of JSON.parse(file)) {
      res.write(JSON.stringify(chunk));
      res.write("\n");
    }

    res.end();
  });
});

app.use(
  "/xi",
  proxy("https://api.elevenlabs.io", {
    proxyReqOptDecorator(options) {
      options.headers!["xi-api-key"] = process.env.XI_API_KEY;
      return options;
    },
  })
);
