import fetch from "node-fetch";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import hbs from "hbs";
import path from "path";
import bodyParser from "body-parser";

// Initialize the Express application to handle and respond to HTTP requests
const app = express();

// Load environment variables from the .env file (into process.env)
dotenv.config();

// Define the port number on which the server will listen for requests
const port = 3003;

// Set Handlebars as the view engine for rendering templates
app.set("view engine", "hbs");
// Set the directory that contains the template files for Handlebars
app.set("views", path.join(path.resolve(), "views"));

// Use the body-parser middleware to be able to access the custom properties in the request body of our /exampleRoute route
app.use(bodyParser.urlencoded({ extended: true }));

//OAUTH2 Values

// Function to encode a string in Base64 URL-safe format, so it can be sent in URLs without encoding issues
const base64URLEncode = (str) =>
  str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

// Function that will take the 'code verifier' string and create a one-way hash (SHA-256) which will be the 'code challenge' string
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest();

// Create a random string of 32 bytes (& encode it in URL-safe Base64 format)
// This will be the 'code verifier' string which acts as a secret that we hold until the token exchange request with Etsy
const oauthCodeVerifier = base64URLEncode(crypto.randomBytes(32));

// Generate the 'code challenge' string by hashing the 'code verifier' string with SHA-256 (& encode the result in URL-safe base64)
// The 'code challenge' is sent to Etsy in the initial authorization request.
// When it comes to the token exchange request Etsy will compare this against our 'code verifier' to verify our identity
const oauthCodeChallenge = base64URLEncode(sha256(oauthCodeVerifier));

// Generate a random string to mitigate CSRF (Cross-Site Request Forgery) attacks during the OAuth process.
// The state is sent in the initial auth request and we then validate it in our app when Etsy rediretcs back to us, in order to ensure that the response is from Etsy
const oauthState = Math.random().toString(36).substring(7);

// Define the redirect URI where Etsy will send the authorization code after the user
// authorizes the application.
// This URI must be registered in the 'Edit your callback URLs' section of Etsy's 'Manage your app' developer dashboard (for the API key you are using) (see README for screenshot)
const oauthRedirectUri = "http://localhost:3003/oauth/redirect";

// Rendering the entry page of our application (./views/etsy_auth.hbs)
// ETSY_API_KEY must be set in your .env file
app.get("/", async (req, res) => {
  // Define the scopes for the OAuth request
  const scopes = ["listings_r", "listings_w", "shops_r", "email_r"].join("%20");

  // Construct the URL to the Etsy OAuth page using the values we defined above & our Etsy API key from .env
  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(
    oauthRedirectUri
  )}&scope=${scopes}&client_id=${
    process.env.ETSY_API_KEY
  }&state=${oauthState}&code_challenge=${oauthCodeChallenge}&code_challenge_method=S256`;

  // Render the etsy_auth view with the constructed URL passed as a property, this will be the URL/link that our /etsy_auth view button will hit
  res.render("etsy_auth", {
    authUrl: authUrl,
  });
});

//ETSY AUTH PROCESS, THE PATH BELOW IS THE ONE WE REGISTERED AS A CALLBACK URL WITH ETSY
// THIS ISN'T A 'VIEW' - IT'S THE REDIRECT URI, SO THE LOGIC IN THE ROUTE BELOW WILL RUN & INTERACT WITH ETSY TO COMPLETE THE AUTH PROCESS WITHOUT USER INTERACTION.
// THEN ULITMATELY THIS ROUTE REDIRECTS TO OUR /home ROUTE ONCE WE SUCCESSFULLY HAVE THE ACCESS TOKEN & REFRESH TOKEN.
app.get("/oauth/redirect", async (req, res) => {
  // Extract the 'state' parameter from Etsy's request
  const state = req.query.state;
  // Check if the state parameter matches our oauthState value that we set earlier - we're verifying the request is truly from Etsy
  if (state !== oauthState) {
    res.send("Error: state mismatch during Etsy auth");
  }

  // Get the temporary authorization code from Etsy's request, we need to use this in our request to Etsy for the access token
  const authCode = req.query.code;

  // Create the request object we need to send to Etsy to exchange the auth code for an access token
  // Note that we have included our 'code verifier' string in the request
  const requestOptions = {
    method: "POST",
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.ETSY_API_KEY,
      redirect_uri: oauthRedirectUri,
      code: authCode,
      code_verifier: oauthCodeVerifier,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Send the request to Etsy's token endpoint
  const response = await fetch(
    "https://api.etsy.com/v3/public/oauth/token",
    requestOptions
  );

  // Now extract the access token (& refresh token) from Etsy's response
  // The refresh token can be used to get a new access token when the current access token expires
  if (response.ok) {
    const tokenData = await response.json();
    const access_token = tokenData.access_token;
    const refresh_token = tokenData.refresh_token;

    // Redirect to the /home route with the access token & refresh token passed as query params
    res.redirect(
      `/home?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } else {
    res.send("Etsy Auth Failed");
  }
});

// Successful OAuth redurects to this route, which renders the './views/home.hbs' page with the access token & refresh token
app.get("/home", async (req, res) => {
  // Extract the access token & refresh token from our /oauth/redirect route's request
  const { access_token, refresh_token } = req.query;

  // Before rendering our home page, we will get the user's name so we can display it in the welcome message
  // We should also get the user's shop ID now, as it is a required value for using a number of endpoints

  // Build request options object to send to Etsy's API endpoints, we include our access token in the headers
  const requestOptions = {
    headers: {
      "x-api-key": process.env.ETSY_API_KEY,
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
    },
  };

  // Extract the Etsy User ID from the access token, we need this to get the user's name from the Etsy users endpoint
  const user_id = access_token.split(".")[0];

  // Send a request to Etsy's users endpoint to get the user's name
  const responseUser = await fetch(
    `https://api.etsy.com/v3/application/users/${user_id}`,
    requestOptions
  );
  let firstName;
  if (responseUser.ok) {
    const userData = await responseUser.json();
    firstName = userData.first_name;
  } else {
    console.log(responseUser.status, responseUser.statusText);
    const errorData = await responseUser.json();
    console.log(errorData);
    res.send("Error getting user's name");
  }

  // Send a request to Etsy's 'me' endpoint to get the user's shop ID
  const responseMe = await fetch(
    "https://openapi.etsy.com/v3/application/users/me",
    requestOptions
  );
  let shopID;
  if (responseMe.ok) {
    const meData = await responseMe.json();
    shopID = meData.shop_id;
  } else {
    console.log(responseMe.status, responseMe.statusText);
    const errorDataMe = await responseMe.json();
    console.log(errorDataMe);
    res.send("Error getting shop ID");
  }

  // We now have the access token, refresh token, user's name & shop ID values
  // Render the home page with the access token, refresh token, user's name & shop ID values passed as props
  res.render("home", {
    first_name_hbs: firstName,
    shop_id_hbs: shopID,
    access_token_hbs: access_token,
    refresh_token_hbs: refresh_token,
  });
});

// Example route hit from the home.hbs form, to demonstrate that we can access the access token, refresh token, shop ID & first name values
app.post("/exampleRoute", (req, res) => {
  // The below values are extracted from the request body of our /exampleRoute route using the body-parser middleware we imported & set at the start of our server.js file
  const { access_token, refresh_token, shop_id, first_name } = req.body;

  // Display the extracted properties to confirm successful passing of the data
  res.send(`
      <h2>See the received data below</h2>
      <p>Access Token: ${access_token}</p>
      <p>Refresh Token: ${refresh_token}</p>
      <p>Shop ID: ${shop_id}</p>
      <p>First Name: ${first_name}</p>
  `);
});

// Start the Express server to listen for requests on the port number we defined at the start of the file
app.listen(port, async () => {
  console.log(`Hi! The app is running at: http://localhost:${port}`);
});
