async function speech(base64file) {
  // Imports the Google Cloud client library
  const speech = require('@google-cloud/speech');
  const fs = require('fs');

  // Creates a client
  const client = new speech.SpeechClient();

  // // The name of the audio file to transcribe
  // const fileName = '/Users/bvodola/Projects/trello-export/server/static/003.ogg';

  // // Reads a local audio file and converts it to base64
  // const file = fs.readFileSync(fileName);
  // const audioBytes = file.toString('base64');

  console.log(base64file);
  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    content: base64file
  };
  const config = {
    encoding: 'OGG_OPUS',
    sampleRateHertz: 16000,
    languageCode: 'pt-BR',
    enableAutomaticPunctuation: true
  };
  const request = {
    audio: audio,
    config: config
  };

  // Detects speech in the audio file
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
  return `Transcription: ${transcription}`;
}

module.exports = speech;

// Client functions
function blobUrlToBlob(blobUrl = '') {
  return new Promise((resolve, reject) => {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', blobUrl, true);
      xhr.responseType = 'blob';
      xhr.onload = function(e) {
        if (this.status == 200) {
          var myBlob = this.response;
          resolve(myBlob);
          // myBlob is now the blob that the object URL pointed to.
        }
      };
      xhr.send();
    } catch (err) {
      reject(err);
    }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function() {
      resolve(reader.result);
    };
    reader.onerror = function(error) {
      reject('Error: ', error);
    };
  });
}

async function blobUrlToBase64(url) {
  const blob = await blobUrlToBlob(url);
  const base64 = await fileToBase64(blob);
  return base64.split('data:audio/ogg;base64,')[1];
}

const findMsg = url =>
  Store.Msg.models.find(m => m.__x_mediaData && m.__x_mediaData.__x_renderableUrl === url);

const getMsgId = msg => msg.__x_id.id;

const transcriptAudioMessages = () => {
  document.querySelectorAll('audio').forEach(async e => {
    console.log(e.src);
    console.log(getMsgId(findMsg(e.src)));
    let base64 = await blobUrlToBase64(e.src);
    ipc.sendFile(base64);
  });
};
