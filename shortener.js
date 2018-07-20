/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
const Express = require('express');
const BodyParser = require('body-parser');
const path = require('path');
const LokiDB = require('lokijs');
const rand = require('random-js');

const app = Express();
let links;
const db = new LokiDB('db', {
  autoload: true,
  autoloadCallback: () => {
    links = db.getCollection('links');
    if (links === null) {
      links = db.addCollection('links');
    }
  },
  autosave: true,
  autosaveInterval: 4000,
});


console.log(links);

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => res.sendFile(path.join(`${__dirname}/index.html`)));

app.post('/new', (req, res) => {
  console.log(`New request received. Url to shorten is ${req.body.targetUrl}`);
  const tryGet = links.findOne({ url: req.body.targetUrl });
  if (tryGet) {
    console.log(`Short URL already exist in the database. ID: ${tryGet.short}`);
  } else {
    const shortUrlId = rand.string('qwertyuopasdfghjklizxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890')(rand.engines.mt19937().autoSeed(), 6);
    links.insert({ url: req.body.targetUrl, short: shortUrlId });
    console.log(`Shout url id is ${shortUrlId}`);
    console.log("Doesn't exist.");
  }

  const queryRes = links.findOne({ url: req.body.targetUrl }).short;

  res.send(`${req.body.targetUrl} => ${queryRes}`);

  console.log(tryGet);
});

app.listen(3000, () => console.log('Server is listening on port 3000...'));
