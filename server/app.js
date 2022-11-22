import express from "express";
import http from "http" ;
import https from "https";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/',(req, res) => {
  res.send('hi');
})

server.listen(8443);

