const okta = require('@okta/okta-sdk-nodejs');
const express = require('express');
const router = express.Router();
const winston = require('winston');
const moment = require('moment');
const fetch = require('node-fetch');
const staticUrl = 'http://static.canal-plus.net/apps/mycanal/prod/api/pass-zone-parameters.json';
const location = require("underscore");
const client = new okta.Client({
  orgUrl: process.env.ORG_URL,
  token: process.env.REGISTRATION_TOKEN
});
let settings = { method: "Get" };
var options = {
  file: {
    level: 'info',
    name: 'file.info',
    filename: `${__dirname}/logs/history.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 100,
    colorize: true,
  },
  errorFile: {
    level: 'error',
    name: 'file.error',
    filename: `${__dirname }/logs/error.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 100,
    colorize: true,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  }
};
let logFile = winston.createLogger({
  transports: [
    new (winston.transports.Console)(options.console),
    new (winston.transports.File)(options.errorFile),
    new (winston.transports.File)(options.file),
  ],
  exitOnError: false, // do not exit on handled exceptions
});
let web_json_data;
let app_locationData={
  form:{}
}
fetch(staticUrl, settings)
  .then(res => res.json())
  .then((json) => {
    web_json_data=json
});
router.post('/', async (req, res, next) => {
  let password=req.body.mdp;
  let email=req.body.email;
  let zipCode;
  let suscription=req.body.numcli;
  let appLocation=req.body.location;
  let json_data=web_json_data.zones;
  let filtered=location.where(json_data, {appLocation:appLocation});
  // console.log("=====whole=====");
  // console.log(web_json_data);
  // console.log("=====filter==========");
  // console.log(filtered);
  if(filtered){
    let appLocation=filtered[0].appLocation;
    let offerzone=filtered[0].offerZone;
    let partners=JSON.stringify(filtered[0].partners);
    console.log("====test======");
    console.log(appLocation, offerzone, partners);
    if(appLocation=='fr'){
       zipCode=req.body.cp;
    }
    try {
      await client.createUser({
        profile: {
          firstName:"test",
          lastName: "test",
          email: email,
          login: email,
          gender:req.body.genre,
          zipCode:zipCode,
          customerNumber:suscription,
          TrackPubNameAPI:'true',
          suscriberId:req.body.choice,
          appLocation:appLocation,
          offerzone:offerzone,
          partners:partners
        },
        credentials: {
          password: {
            value: password,
          },
        },
      }).then(user => {
        logFile.info(moment().format('YYYY-MM-DD-HH-mm-ss-ms'));
        console.log('Created', app_locationData);
        console.log(user);
        res.status(200).send({
          result: 'return',
          message: '200',
          data:user
        });
      })
    } catch ({ errorCauses }) {
      logFile.info(moment().format('YYYY-MM-DD-HH-mm-ss-ms'));
      const errors = errorCauses.reduce((summary, { errorSummary }) => {
        if (/Password/.test(errorSummary)) {
          return Object.assign({ password: errorSummary })
        }
        const [ field, error ] = /^(.+?): (.+)$/.exec(errorSummary)
        return Object.assign({ [field]: error }, summary)
      }, {})
  
      console.log(errors)
      res.status(400).send({
        result: 'return',
        message: '400',
        data:errors
      });
    }

  }else{
    res.status(400).send({
      result: 'return',
      message: '400',
      data:"No applocation"
    });
  }
});
module.exports = router
