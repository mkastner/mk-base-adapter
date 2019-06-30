const log = require('mk-log');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

module.exports = function Server(givenPort, started) {

  return new Promise((resolve, reject) => {

    const port = givenPort || 3001;
    const app = express();

    app.use(bodyParser.json());

    const server = http.createServer(app);

    server.listen(port, (err) => {

      if (err) {
        log.error(err);
        reject(err);
      }
      // hook in into app before server starts

      console.log(`server is listening on ${port}`);
      if (started) {
        started(app, server, port);
      }
      resolve({app, server, port}); 
    });
  
  });

};
