/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
const Express = require('express');
const BodyParser = require('body-parser');
const path = require('path');
const LokiDB = require('lokijs');
const rand = require('random-js');

const app = Express();
let links;
// initialize database
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

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => res.sendFile(path.join(`${__dirname}/index.html`)));

app.post('/new', (req, res) => {
  let mainUrl = req.body.targetUrl;
  if (!mainUrl.startsWith('http')) {
    mainUrl = `http://${mainUrl}`;
  }

  console.log(`New request received. Url to shorten is ${req.body.targetUrl}`);
  const tryGet = links.findOne({ url: mainUrl });
  if (tryGet) {
    console.log(`Short URL already exist in the database. ID: ${tryGet.short}`);
  } else {
    const shortUrlId = rand.string('qwertyuopasdfghjklizxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890')(rand.engines.mt19937().autoSeed(), 6);
    links.insert({
      url: mainUrl, short: shortUrlId, count: 0, expire: Date.now() + 60 * 60 * 24 * 30,
    });
    console.log(`New shout created. Url id is ${shortUrlId}`);
  }

  const queryRes = links.findOne({ url: mainUrl }).short;

  res.send(`${mainUrl} => ${queryRes}`);
});

app.get('/:shortId', (req, res) => {
  try {
    const tryGet = links.findOne({ short: req.params.shortId });
    const redirUrl = tryGet.url;
    console.log(redirUrl);
    res.redirect(302, `${redirUrl}`);
    res.end();
  } catch (error) {
    console.error('Hata');
  }
});

app.listen(3000, () => console.log('Server is listening on port 3000...'));
