const express = require("express");
const router = express.Router();
const trello = require("./index");
const models = require("../models");
const sheets = require("../google/sheets");

router.get("/board/lists", async (req, res) => {
  try {
    const lists = await trello.getBoardLists();
    res.send(lists);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/actions/import", async (req, res) => {
  try {
    const { before, fromDate } = req.query;
    await trello.importAllBoardActions({ before, fromDate });
    res.send("Started Trello Actions Import. Check node console.");
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/cards/import-and-generate-json/", async (req, res) => {
  try {
    importAndGenerateSheet({
      gte: req.query.gte,
      lt: req.query.lt
    });

    // res.header("Content-Type", "application/json");
    // res.send(cards);
    res.send("Started Import. Check node console");
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/cards/export-to-sheets/", async (req, res) => {
  try {
    const cards = await models.Cards.find({});
    await trello.exportCardsToSheet(cards);
    res.send("Started Export. Check node console.");
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

/**
 * Gets board cards with nested actions
 * @param boardLinkId [URL Param] linkId of the board we want to get the actions from
 */
router.get("/board/:boardId/cards/", async (req, res) => {
  try {
    const { boardId } = req.params;
    const { before } = req.query;

    const data = await trello.getAllBoardCards({ boardId, before });
    res.send(data).status(200);
  } catch (err) {
    console.error("ERROR: route board/:boardId/cards/", err);
    res.send(err.message).status(500);
  }
});

router.get("/board/:boardId/report/", async (req, res) => {
  try {
    const { boardId } = req.params;

    const data = await trello.generateBoardReport(boardId);
    res.send(data).status(200);
  } catch (err) {
    console.error("ERROR: route board/:boardId/report/", err.message);
    res.send(err.message).status(500);
  }
});

router.get("/list/:listId/report/", async (req, res) => {
  try {
    const { listId } = req.params;

    const data = await trello.generateListReport(listId);
    res.send(data).status(200);
  } catch (err) {
    console.error("ERROR: route list/:listId/report/", err);
    res.send(err.message).status(500);
  }
});

router.get("/boards/report/", async (req, res) => {
  try {
    await trello.generateAllBoardsReport();
    res.send("OK").status(200);
  } catch (err) {
    console.error("ERROR: route board/:boardId/report/", err.message);
    res.send(err.message).status(500);
  }
});

/**
 * Update the board a card belongs to
 * @param cardId [URL Param] the id of the card to be updated
 * @param newBoardId [URL Param] the id of the board to put the card on
 */
router.put("/card/:cardId/:newBoardId/", async (req, res) => {
  try {
    const { cardId, newBoardId } = req.params;
    const data = await trello.updateCardBoard({ cardId, newBoardId });
    res.send(data.data).status(200);
  } catch (err) {
    console.error("ERROR: route /card/:cardId/:newBoardId/", err);
    res.send(err.message).status(500);
  }
});

const importAndGenerateSheet = async ({ gte = "", lt = "" }) => {
  try {
    // await trello.importAllBoardActions({ before, fromDate });

    console.log("=====================================");
    console.log("Fetching all actions from database...");
    let actions = await models.Actions.find({
      date: { $gte: gte, $lt: lt },
      $or: [
        {
          type: "updateCard",
          "data.listBefore.id": { $exists: true }
        },
        {
          type: "createCard",
          "data.list.id": { $exists: true }
        }
      ]
    });

    console.log(`Fetched ${actions.length} actions`);

    // // Remove duplicate values of actions
    // console.log("Deleting duplicate actions...");
    // for (const doc of actions) {
    //   await models.Actions.deleteOne({
    //     _id: { $lt: doc._id },
    //     action_id: doc.action_id
    //   });
    // }

    // // Fetching updated actions
    // console.log("Fetching updated actions...");
    // actions = await models.Actions.find({
    //   $or: [
    //     {
    //       type: "updateCard",
    //       "data.listBefore.id": { $exists: true }
    //     },
    //     {
    //       type: "createCard",
    //       "data.list.id": { $exists: true }
    //     }
    //   ]
    // });

    // Creating cards from the updated actions
    await trello.createCardsFromActions(actions);

    // // Deleting duplicated cards
    // console.log("Deleting duplicate cards...");
    // for (const doc of cards) {
    //   await models.Cards.deleteOne({
    //     _id: { $lt: doc._id },
    //     card_id: doc.card_id
    //   });
    // }

    // Fetching cards
    console.log("fetching cards...");
    cards = await models.Cards.find();

    // Creating flatCard objects
    console.log("creating flat cards...");
    const flatCards = JSON.parse(await trello.generateCardsJson(cards));
    console.log("flat cards created");

    // Formatting flatCards to conform to the Google Sheets required pattern
    const data = flatCards.map(entry =>
      sheets.formatContactForGoogleSheet(entry)
    );

    // Appending cards to google sheet
    sheets.appendToSheet({
      sheetId: "1VaXW61ibPpzexWi5MJKeorPZ-fx485yfMe9FgjeOqYU",
      range: "Página1",
      data
    });

    console.log("importAndGenerateSheet finished");
  } catch (err) {
    console.error("trello.js", err);
  }
};

module.exports = router;

// Board reaquecimento: 5a1da0d5d191c562c67e97aa
// Board Evolucao CRM: 596cadac4bbb2855dec4faa4
