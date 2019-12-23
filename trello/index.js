const axios = require("axios");
const env = require("../env");
const models = require("../models");
const mongo = require("../mongodb");
const sheets = require("../google/sheets");

let LISTS_NAMES = {
  "596cadb85a54699e4c89f9ab": "1. Call me maybe",
  "5cc8452396a8913d53a4f1ed": "2. Não atendeu",
  "5cfe68503b35c087eb203c4f": "3. Atendeu e não podia falar",
  "5a0b1e9a539248a7aebc3e8b": "4. Desenvolvimento",
  "5cbe3649a6286c06d72947a8": "5. Qualificado",
  "5a0b1eb1749df89fbe2d75e7": "6. Pagamento"
};

// Call the API
const getBoardActions = async (before = "") => {
  const res = await axios.get(
    `http://api.trello.com/1/boards/${env.TRELLO_SOURCE_BOARD_ID}/actions?key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}&limit=1000&memberCreator=false&before=${before}`
  );
  return res.data;
};

const getBoardLists = async () => {
  const res = await axios.get(
    `http://api.trello.com/1/boards/?key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}&limit=1000`
  );
  return res.data;
};

const importAllBoardActions = async ({
  before = "",
  fromDate = null,
  firstCall = true
}) => {
  try {
    // Logging the import process startup
    if (firstCall) {
      console.log(
        `======= Started Import at ${Date.now()}, fromDate: ${fromDate} =======`
      );
    }

    // Logging each API call with it's before argument
    console.log(`Calling API... before: ${before} `);

    // Calling the trello API
    let boardActions = await getBoardActions(before);

    // Rename the action id parameter for each element of the actions array
    boardActions = boardActions.map(a => {
      a.action_id = a.id;
      return a;
    });

    // Insert the recently fetched actions to the database
    await models.Actions.insertMany(boardActions);

    // If we haven't reached the fromDate limit, make a
    // new fetch and continue the actions loop
    const lastBoardAction = boardActions[boardActions.length - 1];
    if (Array.isArray(boardActions) && boardActions.length > 0) {
      if (
        !fromDate ||
        (fromDate && new Date(fromDate) <= new Date(lastBoardAction.date))
      ) {
        const newBefore = lastBoardAction.id;
        await importAllBoardActions({
          before: newBefore,
          fromDate,
          firstCall: false
        });
      }
    }

    // When we reach this point on the first interaction of the loop,
    // we have reached the end of the import, so we log that
    if (firstCall) console.log("Ended Import at", Date.now());
  } catch (err) {
    console.error("ERROR: trello -> importAllBoardActions", err.message);
  }
};

const createCardsFromActions = async actions => {
  try {
    console.log("createCardsFromActions");
    const db = mongo.getDb();
    let cards = await db
      .collection("cards")
      .find({})
      .toArray();

    // Add action to existing card or create new card with action
    actions.forEach((action, i) => {
      // Logging progress on console
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`${i + 1}/${actions.length}`);

      const currentCard = action.data.card;
      let cardIndex = cards.findIndex(c => c.card_id === currentCard.id);

      /*
       * New Card
       */
      if (cardIndex === -1) {
        cards = [
          ...cards,
          {
            ...currentCard,
            card_id: currentCard.id,
            actions: [
              {
                action_id: action.action_id,
                action_type: action.type,
                date: action.date,
                list: action.data.list,
                listBefore: action.data.listBefore,
                listAfter: action.data.listAfter
              }
            ]
          }
        ];

        /*
         * Adding Action to existing Card
         */
      } else {
        const currentCard = cards[cardIndex];

        const duplicatedAction =
          currentCard.actions.findIndex(
            a => a.action_id === action.action_id
          ) >= 0;

        if (!duplicatedAction) {
          cards[cardIndex] = {
            ...currentCard,
            actions: [
              ...currentCard.actions,
              {
                action_id: action.action_id,
                action_type: action.type,
                date: action.date,
                list: action.data.list,
                listBefore: action.data.listBefore,
                listAfter: action.data.listAfter
              }
            ]
          };
        }
      }
    });

    // Delete all $init props from card objects
    cards = cards.map(c => {
      delete c["$init"];
      delete c["__v"];
      // delete c["$__"];
      return c;
    });

    console.log(`- ${cards.length} cards generated will be saved...`);
    // const db = mongo.getDb();
    for (const card of cards) {
      await db.collection("cards").updateOne(
        {
          card_id: card.card_id
        },
        {
          $set: card
        },
        {
          upsert: true
        }
      );
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(card.card_id);
    }

    console.log(" Cards imported");
  } catch (err) {
    console.error("trello -> createCardsFromActions", err);
  }
};

const getCreatedDateFromId = id =>
  new Date(1000 * parseInt(id.substring(0, 8), 16));

const generateCardsJson = async cards => {
  const LISTS_TEMPLATE = {
    "596cadb85a54699e4c89f9ab": "N",
    "Tempo (1)": 0,
    "5cc8452396a8913d53a4f1ed": "N",
    "Tempo (2)": 0,
    "5cfe68503b35c087eb203c4f": "N",
    "Tempo (3)": 0,
    "5a0b1e9a539248a7aebc3e8b": "N",
    "Tempo (4)": 0,
    "5cbe3649a6286c06d72947a8": "N",
    "Tempo (5)": 0,
    "5a0b1eb1749df89fbe2d75e7": "N",
    "Tempo (6)": 0
  };

  return JSON.stringify(
    cards.map(c => generateFlatCardObject(c, LISTS_TEMPLATE))
  );
};

const generateFlatCardObject = (card, LISTS_TEMPLATE) => {
  const lists_template = JSON.parse(JSON.stringify(LISTS_TEMPLATE));
  // Initial list name
  const INITIAL_LIST_ID = "596cadb85a54699e4c89f9ab";

  // Starting desired format
  let flatCard = {
    id: card.card_id,
    ["Card #"]: card.idShort,
    ["Status final"]: "1. Call me maybe"
  };

  // Sort card actions by increasing date
  const date_ms = d => new Date(d).getTime();
  flatCard.actions = card.actions.sort(
    (d1, d2) => date_ms(d1.date) - date_ms(d2.date)
  );

  let lists = {};

  // Populate lists object with start/end objects
  flatCard.actions.forEach(a => {
    if (a.action_type === "updateCard") {
      // Initial list start date
      if (a.listBefore.id === INITIAL_LIST_ID) {
        const createdDate = getCreatedDateFromId(card.card_id);

        if (typeof lists[INITIAL_LIST_ID] === "undefined")
          lists[INITIAL_LIST_ID] = [];
        lists[INITIAL_LIST_ID].push({
          start: createdDate.toString()
        });
      }

      // End date of listBefore
      if (typeof lists[a.listBefore.id] === "undefined") {
        lists[a.listBefore.id] = [];
        LISTS_NAMES[a.listBefore.id] = a.listBefore.name;
      }
      lists[a.listBefore.id].push({
        end: a.date
      });

      // Start date of listAfter
      if (typeof lists[a.listAfter.id] === "undefined") {
        lists[a.listAfter.id] = [];
        LISTS_NAMES[a.listAfter.id] = a.listAfter.name;
      }
      lists[a.listAfter.id].push({
        start: a.date
      });
    }
  });

  // Calculate duration on each list
  let _lists = JSON.parse(JSON.stringify(lists));

  Object.keys(lists).forEach(k => {
    let interval = 0;
    while (lists[k].length > 0) {
      const d1 = lists[k].shift();
      const d2 = lists[k].shift();

      if (
        typeof d1 !== "undefined" &&
        typeof d1.start !== "undefined" &&
        typeof d2 !== "undefined" &&
        typeof d2.end !== "undefined"
      ) {
        interval +=
          (new Date(d2.end).getTime() - new Date(d1.start).getTime()) /
          (1000 * 60 * 60);
        interval = Number(interval.toFixed(2));
        if (typeof lists_template[k] !== "undefined") {
          if (interval > 0) lists_template[k] = "S";
          lists_template[`Tempo (${LISTS_NAMES[k][0]})`] = interval;
        }
      } else if (typeof d1 !== "undefined") {
        flatCard["Status final"] = k;
      }
    }
  });

  flatCard = {
    ...flatCard,
    ...lists_template,
    lists: _lists
  };
  delete flatCard.actions;
  delete flatCard.id;

  const LIST_IDS = Object.keys(LISTS_NAMES);
  Object.keys(flatCard).forEach(k => {
    if (LIST_IDS.indexOf(k) !== -1) {
      flatCard[LISTS_NAMES[k]] = flatCard[k];
      // delete flatCard[k];
    } else if (k === "Status final") {
      if (LISTS_NAMES[flatCard[k]]) flatCard[k] = LISTS_NAMES[flatCard[k]];
    }
  });

  return {
    "Card #": flatCard["Card #"],
    "Status final": flatCard["Status final"],

    "1. Call me maybe": flatCard["1. Call me maybe"],
    "Tempo (1)": flatCard["Tempo (1)"],

    "2. Não atendeu": flatCard["2. Não atendeu"],
    "Tempo (2)": flatCard["Tempo (2)"],

    "3. Atendeu e não podia falar": flatCard["3. Atendeu e não podia falar"],
    "Tempo (3)": flatCard["Tempo (3)"],

    "4. Desenvolvimento": flatCard["4. Desenvolvimento"],
    "Tempo (4)": flatCard["Tempo (4)"],

    "5. Qualificado": flatCard["5. Qualificado"],
    "Tempo (5)": flatCard["Tempo (5)"],

    "6. Pagamento": flatCard["6. Pagamento"],
    "Tempo (6)": flatCard["Tempo (6)"]
  };
};

const exportCardsToSheet = async cards => {
  // Creating flatCard objects
  console.log("creating flat cards...");
  const flatCards = JSON.parse(await generateCardsJson(cards));
  console.log("flat cards created. exporting to google sheets.");

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
};

module.exports = {
  getBoardActions,
  importAllBoardActions,
  createCardsFromActions,
  generateCardsJson,
  getBoardLists,
  exportCardsToSheet
};
