const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const path = require("path");

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/spreadsheets"
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.resolve(__dirname, "./token.json");

function appendToSheet({ sheetId, range, data }) {
  // Load client secrets from a local file.
  fs.readFile(path.resolve(__dirname, "./credentials.json"), (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), _appendToSheet, { sheetId, range, data });
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} callbackParams The parameters that will be passed to the callback function.
 */
function authorize(credentials, callback, callbackParams) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, callbackParams);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        return console.error(
          "Error while trying to retrieve access token",
          err
        );
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function _appendToSheet(auth, { sheetId, range, data }) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: data
      }
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      else return true;
    }
  );
}

/**
 * Simple contact formatting for displaying on Google Sheet
 * @param {Object} contact
 * @returns {Object} Google Sheets formatted contact
 */
const formatContactForGoogleSheet = contact =>
  Object.keys(contact).map(key => contact[key]);

module.exports = {
  SCOPES,
  appendToSheet,
  formatContactForGoogleSheet
};
