const { google } = require("googleapis");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

function getOAuthClient() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function handleOAuthCallback(code) {
  const oauth2Client = getOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token returned. Try again with prompt=consent."
    );
  }

  return tokens.refresh_token;
}

function getAuthorizedOAuthClient() {
  const oauth2Client = getOAuthClient();
  const refreshToken = requireEnv("GOOGLE_REFRESH_TOKEN");

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getAuthorizedOAuthClient,
};
