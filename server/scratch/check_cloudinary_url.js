const https = require('https');

const checkUrl = () => {
  const url = 'https://res.cloudinary.com/dpuda3p68/image/upload/v1784798936/gym_bills/tsambobsihfjg7vjiswp.pdf';
  console.log('Fetching:', url);

  https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
  }).on('error', (e) => {
    console.error('Error:', e.message);
  });
};

checkUrl();
