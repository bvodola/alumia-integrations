const axios = require("axios");
const env = require("../env");
const models = require("../models");
const mongo = require("../mongodb");
const sheets = require("../google/sheets");

// =========
// Constants
// =========
let LISTS_NAMES = {
  "596cadb85a54699e4c89f9ab": "1. Call me maybe",
  "5cc8452396a8913d53a4f1ed": "2. Não atendeu",
  "5cfe68503b35c087eb203c4f": "3. Atendeu e não podia falar",
  "5a0b1e9a539248a7aebc3e8b": "4. Desenvolvimento",
  "5cbe3649a6286c06d72947a8": "5. Qualificado",
  "5a0b1eb1749df89fbe2d75e7": "6. Pagamento"
};

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

const DEFAULT_BOARD_ID = "596cadac4bbb2855dec4faa4";

const _BOARD_IDS = [
  // "5dbb8803e045dc1752fc6294", // RM 10
  // "5db24556b7f1a0318312520a", // RM 9
  // "5da84f1164b310554c5415ac", // RM 8
  // "5d9cf9f9a192aa40c8d2b74b", // RM 7
  // "5d8b81ea576e84068e653c3b", // RM 6
  "5d432549ac241d34741ba148", // RM 5
  "5cfacfde716c1729c81b4010", // RM 4
  "5c715d0ec778d60a47130b91", // RM 3
  "5ba7a4f4b92beb45f9eb5682", // RM 2
  "5a1da0d5d191c562c67e97aa", // RM 1
  "5e0b613ba4b6792569cf3a6d", // M 4T 2019
  "5d933d941ad0ff7b0f58d991", // M 3T 2019
  "5cfacc5f23dcc52de4f1ebb6" // M
];

// =======
// Methods
// =======
/**
 * Get actions from board/list
 * @param {date} before
 */
const getBoardActions = async (before = "") => {
  const res = await axios.get(
    `http://api.trello.com/1/boards/${env.TRELLO_SOURCE_BOARD_ID}/actions?key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}&limit=1000&memberCreator=false&before=${before}`
  );
  return res.data;
};

/**
 * Get all the lists from a board
 * @param {string} boardId
 */
const getBoardLists = async boardId => {
  const res = await axios.get(
    `http://api.trello.com/1/boards/${boardId}/lists?key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}&limit=1000`
  );
  return res.data;
};

/**
 * Update the board that a list belongs to
 * @param {string} listId
 * @param {string} newBoardId
 */

const updateList = async (listId, newBoardId) => {
  const res = await axios.put(
    `https://api.trello.com/1/lists/${listId}?idBoard=${newBoardId}&key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`
  );
  return res;
};

/**
 * Get cards from a board with the actions nested
 *
 * Param is an object with the following properties:
 * @param {string} boardId
 * @param {date} before
 */
const getBoardCards = async ({ boardId, before = "" }) => {
  console.log("getBoardCards", boardId, before);
  const res = await axios.get(
    `https://api.trello.com/1/lists/${boardId}/cards?actions=createCard,updateCard&key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}&limit=300&fields=idShort,name,shortLink,idBoard,idList,desc&sort=-id&before=${before}`
  );
  return res.data;
};

/**
 * Get all cards for a specified board
 *
 * Param is an object with the following properties:
 * @param {string} boardId
 * @param {string} before
 * @param {array} cards
 * @param {int} i
 */
const getAllBoardCards = async ({
  boardId,
  before = "",
  cards = [],
  i = 0
}) => {
  const MAX_ITERATIONS = 10000;

  // Fetch the cards
  const newCards = await getBoardCards({ boardId, before });

  // Concat them with previously fetched cards
  cards = [...cards, ...newCards];

  // Increment number of iterations
  i++;

  // If we have data and the max number of iterations was not reached:
  if (newCards.length > 0 && i < MAX_ITERATIONS) {
    // Set the last item id for pagination purposes
    const lastIdFromNewCards = newCards[newCards.length - 1].id;

    // Call the getAllBoardCards again, with the pagination parameter
    // sleep(interval);
    cards = await getAllBoardCards({
      boardId,
      before: lastIdFromNewCards,
      cards,
      i
    });
  }

  // Return the cards
  return cards;
};

/**
 * Update the board that a card belongs to
 * @param {string} cardId the Id of the card
 * @param {string} newBoardId the new board the card is going to
 */
const updateCardBoard = async (cardId, newBoardId) => {
  const res = await axios.put(
    `https://api.trello.com/1/cards/${cardId}?idBoard=${newBoardId}&key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`
  );
  return res;
};

/**
 * Import all the actions from a board
 * @param {object} config with the following params: {before, fromDate, firstCall}
 */
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

/**
 * Create cards from actions array
 * @param {array} actions
 */
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

/**
 * Get the date from mongodb id
 * @param {ID} id
 */
const getCreatedDateFromId = id =>
  new Date(1000 * parseInt(id.substring(0, 8), 16));

/**
 * Create a JSON object from cards array
 * @param {array} cards
 */
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

/**
 * Convert a single card nested object to a flat one-level properties object
 * @param {object} card
 */
const generateFlatCardObject = card => {
  const lists_template = JSON.parse(JSON.stringify(LISTS_TEMPLATE));
  // Initial list name
  const INITIAL_LIST_ID = "596cadb85a54699e4c89f9ab";
  const card_id = card.card_id || card.id;

  // Starting desired format
  let flatCard = {
    id: card_id,
    ["Card #"]: card.idShort,
    ["Email"]: card.email,
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
    if (a.type === "updateCard" && typeof a.data.listBefore !== "undefined") {
      // Initial list start date
      if (a.data.listBefore.id === INITIAL_LIST_ID) {
        const createdDate = getCreatedDateFromId(card_id);

        if (typeof lists[INITIAL_LIST_ID] === "undefined")
          lists[INITIAL_LIST_ID] = [];

        lists[INITIAL_LIST_ID].push({
          start: createdDate.toString()
        });
      }

      // End date of listBefore
      if (typeof lists[a.data.listBefore.id] === "undefined") {
        lists[a.data.listBefore.id] = [];
        LISTS_NAMES[a.data.listBefore.id] = a.data.listBefore.name;
      }
      lists[a.data.listBefore.id].push({
        end: a.date
      });

      // Start date of listAfter
      if (typeof lists[a.data.listAfter.id] === "undefined") {
        lists[a.data.listAfter.id] = [];
        LISTS_NAMES[a.data.listAfter.id] = a.data.listAfter.name;
      }
      lists[a.data.listAfter.id].push({
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
    } else if (k === "Status final") {
      if (LISTS_NAMES[flatCard[k]]) flatCard[k] = LISTS_NAMES[flatCard[k]];
    }
  });

  return {
    "Card #": flatCard["Card #"],
    Email: flatCard["Email"],
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

    "6. Pagamento": flatCard["6. Pagamento"] || flatCard["5. Negociação"],
    "Tempo (6)": flatCard["Tempo (6)"]
  };
};

/**
 * Export flatCards object to google sheets
 * @param {array} flatCards
 * @param {string} sheetId
 */
const exportCardsToSheet = async (flatCards, sheetId) => {
  // Formatting flatCards to conform to the Google Sheets required pattern
  const data = flatCards.map(entry =>
    sheets.formatContactForGoogleSheet(entry)
  );

  // Appending cards to google sheet
  sheets.appendToSheet({
    sheetId,
    range: "Página1",
    data
  });
};

/**
 * Generates a google sheets report for all the
 * boards listed on the BOARD_IDS constant
 */
const generateAllBoardsReport = async () => {
  try {
    for (boardId of _BOARD_IDS) {
      await generateBoardReport(boardId);
      console.log(boardId, "OK");
    }
  } catch (err) {
    console.log("trello.generateAllBoardsReport", err);
  }
};

/**
 * Extracts the first email from a given string
 * @param {string} text
 */
function extractEmail(text) {
  const match = text.match(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
  );
  if (match && match.length > 0) return match[0];
  else return null;
}

/**
 * Generates a google sheets report listed by card
 * for one board
 * @param {string} boardId
 */
const generateBoardReport = async boardId => {
  console.log(`Starting boardId: ${boardId}`);

  // Set the database variable
  const db = mongo.getDb();
  let boardLists;
  // Get all the lists from board
  try {
    boardLists = await getBoardLists(boardId);
  } catch (err) {
    // Show error in case Trello API fails
    console.log(`erro ao puxar listas do board ${boardId}`);
    throw err.message;

    // Call generateBoardReport again.
    // generateBoardReport(boardId);
  }

  // Get the array of listIds that are prone to error when moving
  let lists = await db
    .collection("lists")
    .find({})
    .toArray();

  for (list of boardLists) {
    // Check if the list is marked as prone to error on database
    if (lists.indexOf(list.id) === -1) {
      if (boardId !== DEFAULT_BOARD_ID) {
        try {
          // Move list to Evolução CRM
          console.log("lista:", list.name, list.id);
          console.log("movendo lista...");
          await updateList(list.id, DEFAULT_BOARD_ID);
          console.log("lista movida");

          // Fetch cards
          let cards = await getAllBoardCards({ boardId: list.id });
          console.log(`${cards.length} cards fetched for list ${list.name}`);
          console.log(cards.map(c => c.idShort));

          // Flatten cards
          const newflatCards = cards.map(card => {
            // Extract email and add to property
            card.email = extractEmail(card.desc);

            // Calculates interval on each column for each card and prints on sheet
            flatCard = generateFlatCardObject(card);

            // Returns the modified array element
            return flatCard;
          });

          // Export to GSheets
          exportCardsToSheet(
            newflatCards,
            "1JmPJP3PA2RursCfBmxv0UoAgt0X1FLYtR5sV3TtR-1E"
          );
        } catch (err) {
          console.log(`erro ao mover lista ${list.id}.`, err.message);

          throw err.message;
        }
      }
    }
  }

  return "OK";
};

/**
 * Generates a google sheets report listed by card
 * for one list
 * @param {string} listId
 */
const generateListReport = async listId => {
  // Fetch cards
  let cards = await getAllBoardCards({ boardId: listId });
  console.log(`${cards.length} cards fetched for list ${listId}`);
  console.log(cards.map(c => c.idShort));

  // Flatten cards
  const newflatCards = cards.map(card => {
    // Extract email and add to property
    card.email = extractEmail(card.desc);

    // Calculates interval on each column for each card and prints on sheet
    flatCard = generateFlatCardObject(card);

    // Returns the modified array element
    return flatCard;
  });

  // Export to GSheets
  exportCardsToSheet(
    newflatCards,
    "1JmPJP3PA2RursCfBmxv0UoAgt0X1FLYtR5sV3TtR-1E"
  );
};

module.exports = {
  generateBoardReport,
  getAllBoardCards,
  getBoardActions,
  getBoardCards,
  importAllBoardActions,
  createCardsFromActions,
  generateCardsJson,
  getBoardLists,
  exportCardsToSheet,
  updateCardBoard,
  generateAllBoardsReport,
  generateListReport
};
