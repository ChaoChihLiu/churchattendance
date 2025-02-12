const axios = require('axios');

const url = 'https://graph.facebook.com/v19.0/348649611662288/messages';
const token = 'EAAoC4u69i3sBO35yCtzO1u575Uipvz1XA52ea0u0W1vaZCdxJlwqWos58UqEbwkvlypJGIiFDDqxEjZCVl05KUZBXt7e7TLO8Rptq3HmCTXZCmZAa3g4tYaZCzAzAiUJP2ubnn4N8DuMZBuvMfZCRZAX2uZAb1AcFluGSpWEBiRU35DpPuBxHLe5O5M2gTN6S7BR8kdx34ztADz8uBd60W';

// const data = {
//   messaging_product: 'whatsapp',
//   to: '6598245416',
//   type: 'template',
//   template: {
//     name: 'hello_world',
//     language: {
//       code: 'en_US'
//     }
//   }
// };
const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '+6598245416',
    type: 'text',
    text: {
      body: 'Hello! This is a customized message sent through test API.'
    }
  };
  

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

axios.post(url, data, { headers })
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
  });
