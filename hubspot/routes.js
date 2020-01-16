const express = require("express");
const router = express.Router();
const { loopContacts } = require("./controllers");

router.get("/report", async (req, res) => {
  try {
    // Get the vidStop parameter
    const vidStop = Number(req.query.vidStop) || null;

    // Get the timeStop parameter
    const timeStop = req.query.timeStop
      ? new Date(req.query.timeStop).getTime()
      : null;

    if (isNaN(timeStop)) {
      throw new Error("Invalid timeStop parameter (NaN)");
    }

    const { sheetId, range } = req.query;
    const sheet = {
      sheetId,
      range
    };

    // Loop all the contacts
    let data = await loopContacts(null, null, vidStop, timeStop, sheet);

    // Send data
    res.send(data);
  } catch (err) {
    console.error("hubspot/routes -> /report", err);
    res.send(err).status(500);
  }
});

module.exports = router;
