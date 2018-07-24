/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
const Express = require('express');
const BodyParser = require('body-parser');
const path = require('path');
const LokiDB = require('lokijs');
const rand = require('random-js');
const fs = require('fs');
const conf = require('./config');

const app = Express();
let links;
// Initialize the database.
const db = new LokiDB('db', {
  autoload: true,
  autoloadCallback: () => {
    links = db.getCollection('links');
    if (links === null) {
      links = db.addCollection('links');
    }
  },
  autosave: true,
  // Save the database every 4 seconds.
  autosaveInterval: 4000,
});

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Send the index file.
app.get('/', (req, res) => res.sendFile(path.join(`${__dirname}/index.html`)));

app.post('/new', (req, res) => {
  let mainUrl = req.body.targetUrl;
  // Check if the posted URL contains an http prefix.
  if (!mainUrl.startsWith('http')) {
    // If it doesn't contain an http prefix, add http prefix to the posted URL.
    mainUrl = `http://${mainUrl}`;
  }

  console.log(`New request received. Url to shorten is ${req.body.targetUrl}`);
  // Chech if the posted URL is already shortened or not.
  const tryGet = links.findOne({ url: mainUrl });
  if (tryGet) {
    // if it is shortened already, show the existing url.
    // IMPLEMENT!
    console.log(`Short URL already exist in the database. ID: ${tryGet.short}`);
  } else {
    // If it is not shortened already, generate a new random string with a lenght of 4.
    // There should be 21381376 unique adress with lenght of 4.
    // If we use 3 charactes instead of 4, there should be 314432 unique combination.
    let shortUrlId = 'aaaa';
    let shortUrlSecret = '123';
    do {
      shortUrlId = rand.string(conf.GENPOOL)(rand.engines.mt19937().autoSeed(), conf.SHORTLENGTH);
      shortUrlSecret = rand.string(conf.SCPOOL)(rand.engines.mt19937().autoSeed(),
        conf.SECRETLENGTH);
    } while (links.findOne({ url: mainUrl }));
    links.insert({
      // Insert the newly generated url into the database with expiraton date of 1 month.
      url: mainUrl,
      short: shortUrlId,
      secret: shortUrlSecret,
      count: 0,
      expire: Date.now() + conf.EXIPRETIME,
    });
    console.log(`New shout created. Url id is ${shortUrlId}`);
  }
  // Get the shorted URL ID from the database.
  const queryRes = links.findOne({ url: mainUrl });
  // Read created.html from the file system then change
  // the placeholder text with actual shorted url.
  fs.readFile(`${__dirname}/created.html`, 'utf8', (err, text) => {
    let newText;
    if (!(conf.PORT === 80)) {
      newText = text.replace('#REPLACETHIS#', `${conf.HOST}:${conf.PORT}/${queryRes.short}`);
    } else {
      newText = text.replace('#REPLACETHIS#', `${conf.HOST}/${queryRes.short}`);
    }
    if (queryRes.count === 0) {
      newText = newText.replace('#SECRETCODE#', queryRes.secret);
    } else {
      newText = newText.replace('#SECRETCODE#', 'The code only shown when view count is 0.');
    }
    res.send(newText);
  });
});

app.get('/:shortId', (req, res) => {
  try {
    const shortUrl = links.findOne({ short: req.params.shortId });
    if (!shortUrl) {
      res.redirect(301, '/');
    } else {
      const redirUrl = shortUrl.url;
      console.log(redirUrl);
      shortUrl.count += 1;
      shortUrl.expire = Date.now() + conf.EXIPRETIME;
      links.update(shortUrl);
      res.redirect(302, `${redirUrl}`);
    }
  } catch (error) {
    console.error('Error while getting the url from the server/db.');
    res.redirect(404, '');
  }
});

app.get('/d/:short/:s', (req, res) => {
  const secretCode = req.params.s;
  const shortId = req.params.short;
  const q = links.findOne({ short: shortId, secret: secretCode });

  if (q) {
    try {
      links.remove(q);
      console.log(`${q.url} is removed from the database.`);
      res.redirect(301, '/');
    } catch (error) {
      console.log(error);
      res.redirect(404, '');
    }
  }
});

app.listen(conf.PORT, () => console.log(`Server is listening on port ${conf.PORT}...`));
