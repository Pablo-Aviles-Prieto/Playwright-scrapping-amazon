const searchAmazonService = require('../services/amazon-scrap.service');

// http://localhost:4000/amazon?data=(URL OR THE SEARCH TERMS)
const searchAmazon = async (req, res) => {
  const data = req.query.data;

  try {
    if (!data) throw new Error();
    const result = await searchAmazonService({ data });
    res.status(200).json(result);
  } catch (err) {
    console.error('err', err);
    return res.status(503).send(err.message);
  }
};

module.exports = searchAmazon;
