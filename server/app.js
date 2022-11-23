import express from "express";
import https from "https";
import fs from 'fs';
import {socketlink} from "server/socketlink.js";

const app = express();

const options = {
        ca: fs.readFileSync('fullchain.pem'),
        key: fs.readFileSync('privkey.pem'),
        cert: fs.readFileSync('cert.pem'),
}

const server = https.createServer(options, app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

socketlink(app,server, true);

app.get('/',(req, res) => {
  res.send('hi');
})

server.listen(8443);

