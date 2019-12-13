const axios = require("axios");
const env = require("../env");
const helpers = require("../helpers");

/**
 * Fetches data from recent contacts endpoint
 * @param {String} vidOffset
 */
const getContacts = async (vidOffset = null) => {
  try {
    const pagination = vidOffset ? `vidOffset=${vidOffset}` : "";

    console.log("calling HubSpot API contacts/all", `vidOffset=${vidOffset}`);
    const res = await axios.get(
      `https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=${env.HUBSPOT_API_KEY}&count=100&${pagination}`
    );

    return res.data;
  } catch (err) {
    console.log("hubspot/controllers -> getContacts()", err);
  }
};

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

const formatContact = contact => {
  const {
    hs_analytics_first_url,
    hs_analytics_first_referrer,
    first_conversion_event_name,
    hs_analytics_source_data_2
  } = contact.properties;

  if (hs_analytics_first_url) {
    // Get URL params from the landing page the contact visited
    const landingPageUrl = hs_analytics_first_url.value;
    const queryParams = helpers.getURLParams(landingPageUrl);

    // Format the institution name
    const INSTITUTIONS = {
      "br.digitalmarketinginstitute.com": "DMI",
      "dmi.espm.br": "ESPM",
      "gestaopublica.fecap.br": "Fecap",
      "posead.institutosingularidades.edu.br": "Singularidades",
      "cursopos.com": "FAT"
    };

    const institution = INSTITUTIONS[helpers.getHostName(landingPageUrl)];

    // Format the source name
    let source = queryParams.utm_source;
    if (
      source === "facebook" &&
      hs_analytics_first_referrer &&
      hs_analytics_first_referrer.value === "http://instagram.com/"
    ) {
      source = "instagram";
    }

    // Setup the formatted contact output object
    let formattedContact = {
      id: contact.vid,
      url: contact["profile-url"],
      source,
      institution,
      campaign: queryParams.utm_campaign,
      ad_group: queryParams.ad_group,
      ad: queryParams.utm_content
    };

    // Linkedin exceptions
    if (source === "linkedin") {
      if (first_conversion_event_name)
        formattedContact.ad = first_conversion_event_name.value;

      if (hs_analytics_source_data_2)
        formattedContact.campaign = hs_analytics_source_data_2.value;
    }

    // Google exceptions
    if (source === "google") {
      formattedContact.ad_group = queryParams.hsa_grp;
    }

    return formattedContact;
  }

  return {};
};

const formatContactForGoogleSheet = contact =>
  Object.keys(contact).map(key => contact[key]);

const loopContacts = async (
  vidOffset = null,
  vidStop = null,
  contacts = []
) => {
  try {
    // Fetching getContacts() with given parameters
    const contactsData = await getContacts(vidOffset);
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

    // Concat contacts array with most recent fetch
    contacts = [...contacts, ...newContacts];
    console.log(contacts.length);

    // Check if we need to keep looping for more contacts
    if (contactsData["has-more"] && vidStopIndex === -1) {
      contacts = await loopContacts(
        contactsData["vid-offset"],
        vidStop,
        contacts
      );
    }

    return contacts;
  } catch (err) {
    console.log("hubspot/controllers -> loopContacts()", err);
  }
};

module.exports = { getContacts, loopContacts, formatContactForGoogleSheet };
