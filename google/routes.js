const express = require("express");
const router = express.Router();
const controllers = require("./controllers");
const sheets = require("./sheets");

router.get("/", async (req, res) => {
  try {
    controllers.test();
  } catch (err) {
    console.error("adwords/routes -> /", err);
    res.send(err).status(500);
  }
});

router.get("/auth", (req, res) => {
  try {
    authUrl = controllers.getAuthUrl();
    console.log(authUrl);
    res.send(authUrl);
  } catch (err) {
    res.send(err).status(500);
  }
});

router.post("/sheets/append", async (req, res) => {
  try {
    sheets.appendToSheet({
      sheetId: "1wZXQ5lEPla-D84Jv20mha-GYYLeFVBhU-u_TtrfzhqI",
      range: "Página1",
      data: req.body.data
    });
    res.sendStatus(200);
  } catch (err) {
    console.error("adwords/routes -> /", err);
    res.send(err).status(500);
  }
});

module.exports = router;
