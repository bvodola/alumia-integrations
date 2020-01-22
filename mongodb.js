const MongoClient = require("mongodb").MongoClient;
const env = require("./env");

// Connection URL
const url = env.MONGO_URL;
// Database Name
const dbName = env.MONGO_DB_NAME;
// Create a new MongoClient
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// DB variable
let db;

module.exports = {
  connect: callback => {
    return client.connect(function(err) {
      if (err) console.log(err);
      else {
        console.log("Connected successfully to server");
        db = client.db(dbName);
        return callback(err);
      }
    });
  },

  getDb: () => {
    return db;
  }
};
