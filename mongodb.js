const MongoClient = require("mongodb").MongoClient;

// Connection URL
const url = "mongodb://localhost:27017";
// Database Name
const dbName = "alumia";
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
