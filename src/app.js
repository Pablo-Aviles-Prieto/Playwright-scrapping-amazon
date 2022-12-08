const express = require('express');
const cors = require('cors');

const amazonRoutes = require('./routes/amazon');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

app.use(amazonRoutes);

app.listen(4000);
