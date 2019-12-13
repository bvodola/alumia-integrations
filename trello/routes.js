const express = require("express");
const router = express.Router();
const trello = require("./index");
const models = require("../models");
const sheets = require("../google/sheets");

router.get("/actions/import/:fromDate", async (req, res) => {
  try {
    trello.importAllBoardActions();
    res.sendStatus(200);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/cards/create", async (req, res) => {
  try {
    trello.createCardsFromActions();
    res.sendStatus(200);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/board/lists", async (req, res) => {
  try {
    const lists = await trello.getBoardLists();
    res.send(lists);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

router.get("/cards/flat-json", async (req, res) => {
  try {
    const cards = await trello.generateCardsJson();
    var fs = require("fs");
    fs.writeFileSync("data.json", cards, "utf8", () => console.log("cb"));

    // res.send(JSON.parse(cards));
    res.sendStatus(200);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

// Complete version of cards/flat-json, including actions/import and cards/create
router.get("/cards/import-and-generate-json/:fromDate?", async (req, res) => {
  try {
    await models.Cards.deleteMany({});
    await models.Actions.deleteMany({});
    await trello.importAllBoardActions("", req.params.fromDate);
    await trello.createCardsFromActions();
    const cards = JSON.parse(await trello.generateCardsJson());
    console.log("cards created");

    const data = cards.map(entry => sheets.formatContactForGoogleSheet(entry));
    sheets.appendToSheet({
      sheetId: "1fAVcrsPy46P6-BTHEVSn_GkTlDqq8TkzHHjrwdt7uAk",
      range: "Página1",
      data
    });

    res.header("Content-Type", "application/json");
    res.send(cards);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

const importAndGenerateSheet = async (fromDate, since = "") => {
  try {
    await models.Cards.deleteMany({});
    await models.Actions.deleteMany({});
    await trello.importAllBoardActions("", fromDate, since);
    await trello.createCardsFromActions();
    const cards = JSON.parse(await trello.generateCardsJson());
    console.log("cards created");

    const data = cards.map(entry => sheets.formatContactForGoogleSheet(entry));
    sheets.appendToSheet({
      sheetId: "1fAVcrsPy46P6-BTHEVSn_GkTlDqq8TkzHHjrwdt7uAk",
      range: "Página1",
      data
    });

    console.log("ok!");
  } catch (err) {
    console.error("trello.js", err);
  }
};

importAndGenerateSheet("2019-11-01");

router.get("/actions/get", async (req, res) => {
  try {
    const actions = await trello.getAllBoardActions();
    res.send(actions).status(200);
  } catch (err) {
    console.error("trello.js", err);
    res.send(err).status(500);
  }
});

module.exports = router;
