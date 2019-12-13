const axios = require("axios");
const env = require("../env");
const helpers = require("../helpers");
const { google } = require("googleapis");
const { GoogleAdsApi } = require("google-ads-api");

// AdWords Auth Config
let ADWORDS_AUTH = {
  developer_token: "N7IRZHP1h54RgNVfCnv0Yw", //your adwords developerToken
  user_agent: "Alumia", //any company name
  mcc_id: "768-541-3511", //the Adwords Account id (e.g. 123-123-123)
  client_id:
    "279642005981-kvmuctu7rrk3cnpptge3q68th7irki5l.apps.googleusercontent.com", //this is the api console client_id
  client_secret: "_2IEHeRIAzwxVfLQ1nA-_CyC",
  redirect_url: "https://alumia.online",
  refresh_token:
    "1//0hi4QEfk2KTWaCgYIARAAGBESNwF-L9Irat8f_xewkRaEMTD5qbX2aj016ctKm1Za6XkY9cy8htPRQw8JHC8Ri26h447qaUjCxdM"
};

// Get Auth URL
const getAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    ADWORDS_AUTH.client_id,
    ADWORDS_AUTH.client_secret,
    ADWORDS_AUTH.redirect_url
  );

  const scopes = ["https://www.googleapis.com/auth/adwords"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes
  });

  return url;
};

const test = () => {
  const client = new GoogleAdsApi({
    client_id: ADWORDS_AUTH.client_id,
    client_secret: ADWORDS_AUTH.client_secret,
    developer_token: ADWORDS_AUTH.developer_token
  });

  const customer = client.Customer({
    customer_account_id: "239-936-0019",
    login_customer_id: ADWORDS_AUTH.mcc_id,
    refresh_token: ADWORDS_AUTH.refresh_token
  });

  // If done correctly, you should now be able to list the campaigns in the account 123-123-123
  console.log(customer.campaigns.list());
};

const controllers = {
  getAuthUrl,
  test
};

module.exports = controllers;
