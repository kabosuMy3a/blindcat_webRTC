import express from "express";
import https from "https";
import fs from 'fs';

const app = express();

const options = {
        ca: fs.readFileSync('fullchain.pem'),
        key: fs.readFileSync('privkey.pem'),
        cert: fs.readFileSync('cert.pem'),
}

const server = https.createServer(options, app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));



app.get('/',(req, res) => {
  res.send('hi');
})

server.listen(8443);

