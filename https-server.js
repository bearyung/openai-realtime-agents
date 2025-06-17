const https = require('https');
const fs = require('fs');
const next = require('next');
const selfsigned = require('selfsigned');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { 
  days: 365,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 2, value: '192.168.4.26' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '192.168.4.26' }
      ]
    }
  ]
});

app.prepare().then(() => {
  https.createServer(
    {
      key: pems.private,
      cert: pems.cert
    },
    (req, res) => {
      handle(req, res);
    }
  ).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('> Ready on https://localhost:3000');
    console.log('> Also accessible at https://192.168.4.26:3000');
    console.log('> Accept the self-signed certificate warning in your browser');
  });
});