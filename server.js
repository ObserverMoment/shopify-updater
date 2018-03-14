const dotenv = require('dotenv').config();
const crypto = require('crypto');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');
const request = require('request-promise');
const bodyParser = require('body-parser');
const queryString = require('query-string');
const cors = require('cors');
const nonceGen = require('nonce')();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

// Import constants for shopifyAPI
const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES } = require('./config/env.js');


const app = express();
// Express middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

// Import the Auth0 passport.js strategy. Then set it up as middleware.
const passport = require('passport');
const auth0Strategy = require('./auth0');

passport.use(auth0Strategy);

// This can be used to keep a smaller payload
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ...
app.use(passport.initialize());
app.use(passport.session());

// Endpoints. TODO. These should be in an endpoint config file.
const shopifyAuthEP = '/oauth/authorize';
const shopifyTokenEP = '/oauth/access_token';


// App URLs. TODO. Place in env vars.
const reactFrontEnd = `http://localhost:3000`;
const redirect_uri = `http://localhost:8888/callback`;


////////////////////////// User login routes.



////////////////////////// Database Query Routes


///////////////////////// API Routes
app.get('/connect', (req, res) => {
  const { shop } = req.query;
  // Check that a shop name was correctly passed.
  if (shop) {
    let state = nonceGen();
    let qs = queryString.stringify({
      client_id: SHOPIFY_API_KEY,
      scope: SCOPES,
      state,
      redirect_uri
    });
    // You must set a cookie on your response object so that the next endpoint can access it in req.headers.
    res.cookie('state', state);
    // TODO. There should be no hardcoded endpoints here in the app.
    // All this should come from env variables when the app is booted up.
    const connectionUrl = `https://${shop}/admin${shopifyAuthEP}?${qs}`;
    res.redirect(connectionUrl);
  } else {
    return res.status(400)
              .send('Missing shop parameter. Please add ?shop=your-shop-name to your request');
  }

});

app.get('/callback', (req, res) => {
  // State here has come from Shopify and must be matched to the state you sent in the previous redirect.
  const { shop, hmac, code, state } = req.query;
  // The stateCookie here is the nonce that you generated in the previous step.
  const stateCookie = cookie.parse(req.headers.cookie).state;
  // Check the new state vs your cookie to confirm origin or the response.
  if (state !== stateCookie) { return res.status(403).send('Request origin cannot be verified'); }

  // Check all other necessary details have been passed.
  if (shop && hmac && code) { // code is the auth code that shopify have sent for you to use to get a token.
    // Verify the response.
    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const msgToHash = queryString.stringify(map);
    const generatedHash = crypto
                              .createHmac('sha256', SHOPIFY_API_SECRET)
                              .update(msgToHash)
                              .digest('hex');


    if (generatedHash === hmac) { // Your hashes match so the origin of the access token is confirmed as Shopify.
      let accessTokenUri = `https://${shop}/admin${shopifyTokenEP}`;
      // Create the data for the post request to get the access token.
      let authOptions = {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      }
      // Then make a POST request to get an access token.
      request.post(accessTokenUri, { json: authOptions })
             .then((accessTokenResponse) => {
               let { access_token: accessToken } = accessTokenResponse;
               // TODO. Save the access token into the users database and let the front end know that this is done.
               res.redirect(`${reactFrontEnd}?apiconnected=true&access_token=${accessToken}`);
             })
             .catch(err => console.log(err));

    } else {
      return res.status(400).send('HMAC Origin Validation Failed');
    }
    // Get permanent access token.
    // Securely store the token somewhere that the user can access it when they log in - in the database??
    // Then go back to the frontend and confirm that this has been done
    // When the front end makes a call the backend uses the specific shop name to lookup the access token in the db.
    // This way the frontend never exposes the access token or any other secrets.
    // So you will need two databases. 1. Users. 2. Access tokens.
    // This will be handled in a separate route below /request-data or something similar.
  }
});

app.post('/request-data', (req, res) => {
  const { accessToken, shop, endpoint } = req.body;
  console.log(accessToken);
  console.log(shop);
  let shopRequestUrl;
  switch(endpoint) {
    case "orders":
      shopRequestUrl = `https://${shop}/admin/orders.json?status=any`;
      break;
    case "inventory":
      shopRequestUrl = `https://${shop}/admin/products.json`;
      break;
    default:
      res.send("Invalid endpoint specified");
      break;
  }
  const shopRequestHeaders = {
    'X-Shopify-Access-Token': accessToken,
  };

  request.get(shopRequestUrl, { headers: shopRequestHeaders })
  .then((shopResponse) => {
    res.status(200).end(shopResponse);
  })
  .catch((error) => {
    res.status(error.statusCode).send(error.error.error_description);
  });
})

app.get('*', (req, res) => {
  res.send("Hello from the server again");
});

const port = 8888;
app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});

// Will run the backend app on https://retailoctopusapp.localtunnel.me
// const tunnel = localtunnel(port, { subdomain: 'retailoctopusapp'}, (err, tunnel) => {
//   app.listen(port, () => {
//     console.log(`Listening on port ${port}.`);
//   });
// });
