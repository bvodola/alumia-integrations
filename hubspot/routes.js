const express = require("express");
const router = express.Router();
const { loopContacts } = require("./controllers");

router.get("/report", async (req, res) => {
  try {
    // Get the vidStop parameter
    const vidStop = Number(req.query.vidStop) || null;
    const { sheetId, range } = req.query;
    const sheet = {
      sheetId,
      range
    };

    // Loop all the contacts
    let data = await loopContacts(null, null, vidStop, [], sheet);

    // Send data
    res.send(data);
  } catch (err) {
    console.error("hubspot/routes -> /report", err);
    res.send(err).status(500);
  }
});

module.exports = router;
