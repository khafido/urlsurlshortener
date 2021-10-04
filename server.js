require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongo = require('mongodb');
const mongoose = require('mongoose');
var bodyParser = require('body-parser')
const shortId = require('shortid');
const validUrl = require('valid-url');
const dns = require('dns'); 

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});

const conn = mongoose.connection;
conn.on('error', console.error.bind(console, 'connection error: '));
conn.once('open', () => {
  console.log('MongoDB connected!');
});

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
})
const URL = mongoose.model("URL", urlSchema);

// let result;
app.post('/api/shorturl/', async function (req, res){
  const url = req.body.url_input;
  // const urlCode = shortId.generate();
  const urlCode = Math.floor((Math.random() * 1000) + 1);
  
  var regex = /^https?:\/\//;

  if (regex.test(url)) {
    var tempDnsUrl = url.slice(url.indexOf("//") + 2); 
    var slashIndex = tempDnsUrl.indexOf("/");
    var dnsUrl = slashIndex < 0 ? tempDnsUrl : tempDnsUrl.slice(0, slashIndex); 
    console.log("slashIndex: " + slashIndex);
    console.log("dnsUrl: " + dnsUrl);
    dns.lookup(dnsUrl, async function(err, value) {  //check for valid url
      if (err) { 
        console.log(err); 
        res.json({error: "invalid url"});
      } else if (value !== undefined) {
        console.log("address: " + value);
        try{
          let findOne = await URL.findOne({
            original_url: url
          });
          if(findOne){
            res.json({
              original_url: findOne.original_url,
              short_url: parseInt(findOne.short_url)
            });
          } else {
            findOne = new URL({
              original_url: url,
              short_url: parseInt(urlCode)
            });

            await findOne.save();
            res.json({
              original_url: findOne.original_url,
              short_url: parseInt(findOne.short_url)
            });
          }
        } catch(err){
          console.error(err);
          res.status(500).json('Server error...');
        }
      } 
    });  //dns.lookup
  } else {
    res.json({error: "invalid url"});
  }

//   dns.lookup(url, async function (err, value) { 
//     if(err) { 
//       console.log(err);
//       res.status(401).json({
//         error: 'Invalid URL'
//         // error: err
//       })
//     } else {
      
//     }
//   });    
});

app.get('/api/shorturl/:short_url/?', async function (req, res) {
  try{
    const urlParams = await URL.findOne({
      short_url: req.params.short_url
    });
    if(urlParams){      
      console.log(urlParams.original_url);      
      return res.redirect(urlParams.original_url);     
    } else {
      return res.status(404).json('URL not found!');
    }
  } catch(err) {
    console.error(err);
    res.status(500).json('Server error...');
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
