const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const env = require("./env");
const upsertMany = require("@meanie/mongoose-upsert-many");

// ===============
// Database Config
// ===============
mongoose.plugin(upsertMany);
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const mongoosePromise = mongoose.connect(env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoosePromise.catch(reason => {
  console.log(reason);
});

// =======
// Schemas
// =======
const usersSchema = new Schema(
  {
    email: String,
    password: String,
    created: { type: Date, default: Date.now }
  },
  { strict: false }
);

usersSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};

usersSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

const actionsSchema = new Schema(
  {
    data: {
      card: {
        idList: String,
        id: String,
        name: String,
        idShort: String,
        shortLink: String
      },
      list: {
        id: String,
        name: String
      },
      listBefore: {
        id: String,
        name: String
      },
      listAfter: {
        id: String,
        name: String
      }
    },
    idMemberCreator: String,
    type: String,
    date: String,
    action_id: { type: String },
    created: { type: Date, default: Date.now }
  },
  { strict: false }
);

const cardsSchema = new Schema(
  {
    idList: String,
    id: String,
    name: String,
    idShort: String,
    shortLink: String,
    card_id: { type: String },
    idMemberCreator: String,
    actions: [
      {
        action_id: String,
        action_type: String,
        date: String,
        list: {
          id: String,
          name: String
        },
        listBefore: {
          id: String,
          name: String
        },
        listAfter: {
          id: String,
          name: String
        }
      }
    ],

    created: { type: Date, default: Date.now }
  },
  { strict: false }
);

const flatCardsSchema = new Schema(
  {
    created: { type: Date, default: Date.now }
  },
  { strict: false }
);

const listsSchema = new Schema(
  {
    created: { type: Date, default: Date.now }
  },
  { strict: false }
);

const models = {};
models.Users = mongoose.model("users", usersSchema);
models.Actions = mongoose.model("actions", actionsSchema);
models.Cards = mongoose.model("cards", cardsSchema);
models.FlatCards = mongoose.model("flatcards", flatCardsSchema);
models.Lists = mongoose.model("lists", listsSchema);

module.exports = models;
