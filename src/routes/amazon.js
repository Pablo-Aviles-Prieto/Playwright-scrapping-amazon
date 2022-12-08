const { Router } = require('express');
const searchAmazon = require('../controllers/amazon.controller');

const router = Router();

router.get('/amazon', searchAmazon);

module.exports = router;
