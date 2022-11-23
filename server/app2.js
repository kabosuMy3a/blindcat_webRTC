import express from "express";
import http from "http";
import { socketlink } from "./socketlink.js";

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


socketlink(app, server, false);


app.get('/',(req, res) => {
  res.send('hi');
})

server.listen(8000);

