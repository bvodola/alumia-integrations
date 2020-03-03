const express = require("express");
const router = express.Router();
const {
  loopContacts,
  queryContacts,
  getDealsFromContact
} = require("./controllers");

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

router.get("/contacts/query", async (req, res) => {
  try {
    // Get the query parameter
    const query = req.query.q || null;

    const data = await queryContacts(query);

    // Send data
    res.send(data);
  } catch (err) {
    console.error("hubspot/routes -> /contact/query", err);
    res.send(err).status(500);
  }
});

router.get("/contacts/:contactId/deals", async (req, res) => {
  try {
    // Get the contactId parameter
    const contactId = req.params.contactId || null;
    console.log("contactId", contactId);

    const deals = await getDealsFromContact(contactId);

    // Send data
    res.send(deals);
  } catch (err) {
    console.error("hubspot/routes -> /contact/query", err);
    res.send(err).status(500);
  }
});

module.exports = router;
