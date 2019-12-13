const getURLParams = url => {
  const regex = /[?&]([^=#]+)=([^&#]*)/g;
  let params = {},
    match;

  while ((match = regex.exec(url))) {
    params[match[1]] = decodeURLParam(match[2]);
  }

  return params;
};

const decodeURLParam = str => decodeURIComponent(str).replace(/\+/g, " ");

const getHostName = url => new URL(url).hostname;

const helpers = {
  getURLParams,
  decodeURLParam,
  getHostName
};

module.exports = helpers;
