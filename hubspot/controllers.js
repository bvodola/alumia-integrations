const axios = require("axios");
const env = require("../env");
const sheets = require("../google/sheets");
const helpers = require("../helpers");

/**
 * Fetches data from HubSpot API: all contacts endpoint
 * @param {String} vidOffset
 * @returns {Array} HubSpot contacts
 */
const getContacts = async (vidOffset = null, timeOffset = null) => {
  try {
    let pagination = vidOffset ? `&vidOffset=${vidOffset}` : "";
    pagination += timeOffset ? `&timeOffset=${timeOffset}` : "";

    console.log(
      "calling HubSpot API contacts/all",
      `vidOffset=${vidOffset} timeOffset=${timeOffset}`
    );
    const COUNT = 100;
    const res = await axios.get(
      `https://api.hubapi.com/contacts/v1/lists/all/contacts/recent?hapikey=${env.HUBSPOT_API_KEY}&count=${COUNT}${pagination}`
    );

    return res.data;
  } catch (err) {
    console.log("hubspot/controllers -> getContacts()", err);
  }
};

/**
 * Gets detailed information about the contacts passed as an array
 * @param {Array} contacts the contacts you want to get more information from
 * @returns {Array} the contacts array with detailed info about each
 */
const getContactsDetailedInfo = async contacts => {
  try {
    const vidsParam = `&vid=${contacts.map(c => c.vid).join("&vid=")}`;

    const res = await axios.get(
      `https://api.hubapi.com/contacts/v1/contact/vids/batch/?hapikey=${env.HUBSPOT_API_KEY}${vidsParam}`
    );

    const detailedContacts = Object.keys(res.data).map(key => res.data[key]);
    return detailedContacts;
  } catch (err) {
    console.log("hubspot/controllers -> getContactsDetailedInfo()", err);
  }
};

/**
 * Formats each contact as a flat object, on the needed format for our report
 * @param {Object} contact
 * @returns {Object} the formatted contact
 */
const formatContact = contact => {
  // Get HubSpot parameteres needed for the report
  const {
    hs_analytics_first_url,
    hs_analytics_last_url,
    hs_analytics_first_referrer,
    hs_analytics_last_referrer,
    first_conversion_event_name,
    hs_analytics_source_data_2
  } = contact.properties;

  // Get the form-submissions value needed for the report
  const form_submission_page =
    contact["form-submissions"][0] &&
    contact["form-submissions"][0]["page-url"];

  if (
    hs_analytics_first_url ||
    hs_analytics_last_url ||
    hs_analytics_first_referrer ||
    hs_analytics_last_referrer ||
    form_submission_page
  ) {
    // Create array with all the possible URLs that might hold the params we need
    const landingPageUrls = [
      hs_analytics_first_url && hs_analytics_first_url.value,
      hs_analytics_last_url && hs_analytics_last_url.value,
      hs_analytics_first_referrer && hs_analytics_first_referrer.value,
      hs_analytics_last_referrer && hs_analytics_last_referrer.value,
      form_submission_page
    ];

    // Get the query params from the all the URLs inside an object
    let queryParams = {};

    landingPageUrls.forEach(lp => {
      queryParams = {
        ...queryParams,
        ...helpers.getURLParams(lp)
      };
    });

    // Array of formatted institution names
    const INSTITUTIONS = {
      "br.digitalmarketinginstitute.com": "DMI",
      "dmi.espm.br": "ESPM",
      "gestaopublica.fecap.br": "Fecap",
      "posead.institutosingularidades.edu.br": "Singularidades",
      "cursopos.com": "FAT"
    };

    // Get the name of the institution from the hostname of the last_url param
    const institution =
      INSTITUTIONS[helpers.getHostName(hs_analytics_last_url.value)];

    // Source Parameter
    let source = queryParams.utm_source;

    // Setup the formatted contact output object
    let formattedContact = {
      id: contact.vid,
      hs_url: contact["profile-url"],
      institution,
      utm_source: source,
      utm_campaign: queryParams.utm_campaign,
      hsa_grp: queryParams.hsa_grp || queryParams.ad_group,
      utm_content: queryParams.utm_content
    };

    // Instagram exception
    if (
      source === "facebook" &&
      hs_analytics_first_referrer &&
      hs_analytics_first_referrer.value === "http://instagram.com/"
    ) {
      source = "instagram";
    }

    // Linkedin exceptions
    if (source === "linkedin") {
      // if (first_conversion_event_name)
      //   formattedContact.ad = first_conversion_event_name.value;

      if (hs_analytics_source_data_2)
        formattedContact.utm_campaign = hs_analytics_source_data_2.value;
    }

    return formattedContact;
  }

  return {};
};

/**
 * Formats contacts data and append them to Google Sheet
 * @param {Array} data the array of data to be appended to the google sheet
 * @param {*} sheetId the ID of the sheet. Example: 1XTVt04G7zIc2V8W-OkbYGfrGPbYEbSYlY6DRt_R4-WU
 */
const formatAndAppendToSheet = (data, sheetId, range = "Página1") => {
  // Format array for Google Sheets
  data = data.map(entry => sheets.formatContactForGoogleSheet(entry));

  // Append to google sheets
  sheets.appendToSheet({
    sheetId,
    range,
    data
  });
};

/**
 * Fetches contacts from HubSpot API, looping through its pagination
 * @param {Number} vidOffset Pagination parameter to define the first vid to be fetched
 * @param {Number} timeOffset Pagination parameter to define the first datetime to be fetched
 * @param {Number} vidStop Pagination parameter to define the last vid to be fetched
 * @param {Array} contacts Contacts fetched on a previous loop iteraction are stored here
 * @param {Object} sheet Contains 2 props: sheetId and range of the google sheet we will append to
 *
 * @returns {Array} All the looped contacts
 */
const loopContacts = async (
  vidOffset = null,
  timeOffset = null,
  vidStop = null,
  contacts = [],
  sheet
) => {
  try {
    // Fetching getContacts() with given parameters
    const contactsData = await getContacts(vidOffset, timeOffset);

    // Getting detailed info about each contact
    const contactsDetailedInfo = await getContactsDetailedInfo(
      contactsData.contacts
    );

    // Check if we have the vidStop condition and find its index on the array
    const vidStopIndex = contactsDetailedInfo.findIndex(c => c.vid === vidStop);

    // Slice the array in case of a vidStop condition
    let newContacts =
      vidStopIndex !== -1
        ? contactsDetailedInfo.slice(0, vidStopIndex)
        : contactsDetailedInfo;

    // Parse contacts to the required format
    newContacts = newContacts.map(c => formatContact(c));

    // Appends the newly fetched contacts to google sheet
    formatAndAppendToSheet(newContacts, sheet.sheetId, sheet.range);

    // Concat contacts array with most recent fetch
    contacts = [...contacts, ...newContacts];

    // Check if we need to keep looping for more contacts
    if (contactsData["has-more"] && vidStopIndex === -1) {
      contacts = await loopContacts(
        contactsData["vid-offset"],
        contactsData["time-offset"],
        vidStop,
        contacts,
        sheet
      );
    }

    return contacts;
  } catch (err) {
    console.log("hubspot/controllers -> loopContacts()", err);
  }
};

module.exports = { loopContacts };
