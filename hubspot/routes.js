const express = require("express");
const router = express.Router();
const sheets = require("../google/sheets");
const { loopContacts } = require("./controllers");

router.get("/report", async (req, res) => {
  try {
    // Get all contacts
    const vidStop = Number(req.query.vidStop) || null;
    console.log(req.query);
    let data = await loopContacts(null, vidStop);
    data = data.map(entry => sheets.formatContactForGoogleSheet(entry));
    sheets.appendToSheet({
      sheetId: "1wZXQ5lEPla-D84Jv20mha-GYYLeFVBhU-u_TtrfzhqI",
      range: "Página1",
      data
    });
    res.send(data);
  } catch (err) {
    console.error("hubspot/routes -> /report", err);
    res.send(err).status(500);
  }
});

module.exports = router;
