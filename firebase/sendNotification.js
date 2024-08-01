const { JWT } = require('google-auth-library');
const axios = require('axios');
const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

const client = new JWT({
  email: process.env.JWT_CLIENT_EMAIL,
  key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCmGd9KLKN8yIip\nROoJyM1gcvs+v8a5VjMmiJVRSGNEb2y0+B7lR8WwEIdtAmicX7EbEEGUiy94Wpia\nPmsIE8YDFPa6AdwXTS3u+XUEfT0ddhs5w9TtWul/vXjNtAtxTwXcQ480RSW9IJfS\nPYJY0l16zdTP3iOmRRS4CZ5b6Fa9JrHxeR29fpyIAhIMWBCn9oChXz6f0jUSeDUo\nlLqzHgXOqGMlsbfOcXkD6jeeWLZyQbxwRUMMZIPdwxdlw7rWCLCJjG3KnXOkJsRV\nTj+8eLayoL1LpE82XDrthHpQIoLPOTZs82GTyfNdsNYcPM/2fQ1Giulp+wHQRjsj\nn66TvTtrAgMBAAECggEAILJ1Hx/cawL6y/9x5s0tiK/5v2d3EiLi3NIEOsT6LY2V\no6Y4RsAzLS6DyjSwLSA1N/OiRUCE7rc+1RY2cZea4h5tVz5oefnKcgGPRHv23ObU\nAzIGp1a/IlNFBZFMs1hv+eUeupZmEG3rFQrgruVyW2tLWkQLVn7Azl2uW79H2+IB\n2dZhEiN/Hpo3P8VbbQAF8fhecgBoccDRXkX690gQ2eGiCCi1inZT7qVba7IJuFSo\n0mpZlu+whepQs0efoxA6By8Ftkn5fXkfjxxcO8uJO36paQoZgGbmkdnny966IAtr\nzwMaNJfQIjzfvTWsRRaTSXYAhbzXZ2enBKduiRStAQKBgQDYx5Jzl8IvwojTrn94\nIiLxaoE/FVoZGp2jvxyPB6IME9SzqwQXgFf8Wmnql3KWfNa20DP8+cS/gWUeWG97\nkfteC3hybfetHJTPax4b5GnhZwBjEu4zKkwmphWrli+Tsvo0hj0ZQ3RLokjiF1pN\nmvYcQ7UYQSigWeFtEkEQFHpf6wKBgQDEJw8RUquNh+mjxEkfuo+yLbaPovBkJ8U7\n4pEg/Si/4yOd0pwNBhcjOnOenz9kZC0v1KtCMpYYG58G+GheuU89goWgknMFOdTO\n/Udt6pilLKw4fl8a8h6V13eBhSKeLG1xppmGaPCoWKAXODs9TqHIO2xFK1WujJ4G\nZbH6Q0UygQKBgBdACGgXbb9bmPtDKu7CkobcCnKuopQws5mdZL2+btXmxphijjTL\nEiTBubxsc+DKEOlYmUrXqw9zHFpN198kABbNGiUDwF2zxA4fCgKp0+VV+8ekfyHD\ntpkqlQZrPD0WJBnAEAuGnZGDHVgKcygBp8XOST0JuAbCvRfKrmnAGIPzAoGBAIwH\nGiGSs7dAnFD1sgH9i9F2Asq9VgEZxxp+Hn6/WxTJEMb877v4ahITCzDknDuNrBhm\nKLAELtQc+8TdFpzwixntEHnVsli7tSji9NgJzliz8GoQBNLWn3D2tXB324OxUZv9\ng8HJLmvvgLGyyc91T9cCXMNwMSV/atxEQu7WkRKBAoGBALyJ1QLoELM17TDT/qn1\nFPyltvQ/Fn6KGPCOTqMNVI1Z6pb3qAC+eVbVnEtVsZSMtbKVp6Vs7hF1SFI/ng0z\nNB1jeXJUMq8tykP1qdACXEZEm2aTpcOhX4SAl58Vos5kg385iz+mwHzbxy8EH2nH\nMb5Qog2h4HllTDhZ1Ue69EmY\n-----END PRIVATE KEY-----\n",
  scopes: SCOPES

});

let cachedAccessToken = null;

async function getAccessToken() {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    const tokens = await client.authorize();
    console.log("\n" + tokens.access_token);
    cachedAccessToken = tokens.access_token;
    return cachedAccessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error; // Handle or rethrow the error as needed
  }
}

async function sendFcmMessage(tokens, title, body) {
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/test-project-push-1efd3/messages:send`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; UTF-8"
};

// Prepare an array of message requests for each token
const messageRequests = tokens.map(token => ({
  message: {
    token: token,
    notification: {
      title: title,
      body: body
    }
  }
}));

// Send multiple FCM messages in parallel
const promises = messageRequests.map(messageRequest =>
  axios.post(url, messageRequest, { headers })
);

try {
  const responses = await Promise.all(promises);
  const success = responses.every(response => response.status === 200);
  if (success) {
    console.log("Notifications sent successfully");
    return true;
  } else {
    console.error("Failed to send some notifications");
    return false;
  }
} catch (error) {
  console.error("Error sending FCM messages:", error.response ? error.response.data : error.message);
  return false;
}
}

module.exports = { sendFcmMessage };