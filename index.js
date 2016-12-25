const record = require('node-record-lpcm16');
require('dotenv').load();
const player = require('play-sound')(opts = {player:'mplayer'});
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const urlParse  = require('url').parse;

const snowboy = require('snowboy');

const googleTTS = require('google-tts-api'); //this is use for text to speech
const speech = require('@google-cloud/speech')({
  projectID: 'projectari-153322',
  keyFilename: 'resources/projectAri-d1fc30912718.json',
});

const apiai = require('apiai');
const app = apiai(process.env.APIAI_KEY);

const SESSION_ID = '123456';

var isDetected = false;
var isSilenced = false;
var file;
var requestPath;

const models = new snowboy.Models();
models.add({
  file: 'resources/alexa.umdl',
  sensitivity: '.5',
  hotwords : 'alexa'
});

models.add({
  file: 'resources/Hey_Justin.pmdl',
  hotwords: 'justin'
})

models.add({
  file: 'resources/Aira.pmdl',
  sensitivity: '.3',
  hotwords: 'aira'
})

const detector = new snowboy.Detector({
  resource: "resources/common.res",
  models: models,
  audioGain: 2.0
});

const mic = record.start({
  threshold: 0,
  verbose: false
});

detector.on('silence', function() {
  console.log("silence");
  if (isDetected && !isSilenced){
    console.log("silence but detect sound");
    isSilenced = true;
    setTimeout ( () => {
      isSilenced = false;
      isDetected = false;
      playSoundFile('resources/ding.wav');
      processRequest(requestPath);
      mic.unpipe(file);
    }, 3000);
  }
});

detector.on('sound', function () {
  console.log("heard something");
});

detector.on('error', function (err) {
  console.log('error');
  console.log(err);
});

detector.on('hotword', function (index, hotword) {
  console.log(isDetected);
  if (!isDetected){
    console.log('hotword', index, hotword);
    makeRequest('resources/request.wav');
    isDetected=true;
  }
});

mic.pipe(detector);

const playSoundFile = (filePath) => {
  console.log(`${filePath} is played`);
  player.play(filePath, (err) => {
    if (err) throw err;
  })
}

const makeRequest = (filePath) => {
  requestPath = filePath;
  file = fs.createWriteStream(filePath);
  mic.pipe(file);
  playSoundFile('resources/dong.wav')
  setTimeout(()=>{
    if (isDetected){
      isDetected = false;
      playSoundFile('resources/ding.wav');
      processRequest(requestPath);
      mic.unpipe(file);
    }
  }, 10000);
}

const processRequest = (filePath) => {
  speech.recognize(filePath, {
    encoding: 'LINEAR16',
    sampleRate: 16000
  },function(err, transcript){
    if (err){
      console.log(err);
    } else {
      console.log(transcript);
      if (transcript != ''){
        var request = app.textRequest(transcript,{
          sessionId:SESSION_ID,
        });
        request.on('response', (response) =>{
          console.log('got a response');
          console.log(response.result.action);
          console.log(response.result.fulfillment);
          mic.unpipe(detector);
          textToSpeech(response.result.fulfillment.speech,'resources/response.mp3');
          console.log(response.result.fulfillment.messages);
        });
        request.on('error', (error) =>{
          console.log("err");
          console.log(error);
        });
        request.end();
      }
    }
  });
};

const downloadFile = (url, dest) => {
  return new Promise(function (resolve, reject) {
    var info = urlParse(url);
    var httpClient = info.protocol === 'https:' ? https : http;
    var options = {
      host: info.host,
      path: info.path,
      headers: {
        'user-agent': 'WHAT_EVER'
      }
    };

    httpClient.get(options, function(res) {
      // check status code
      if (res.statusCode !== 200) {
        reject(new Error('request to ' + url + ' failed, status code = ' + res.statusCode + ' (' + res.statusMessage + ')'));
        return;
      }

      var file = fs.createWriteStream(dest);
      file.on('finish', function() {
        // close() is async, call resolve after close completes.
        file.close(resolve);
      });
      file.on('error', function (err) {
        // Delete the file async. (But we don't check the result)
        fs.unlink(dest);
        reject(err);
      });

      res.pipe(file);
    })
    .on('error', function(err) {
      reject(err);
    })
    .end();
  });
}

const textToSpeech = (response,dest) => {
  if (response != ''){
    googleTTS(response, 'en', 1).then((url)=>{
      console.log(url);
      return downloadFile(url, dest);
    }).then(()=>{
        playSoundFile(dest);
        mic.pipe(detector);
    }).catch((err) => {
      console.error(err.stack);
    })
  } else {
    mic.pipe(detector);
  }
};
