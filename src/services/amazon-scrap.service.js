const { v4: uuidv4 } = require('uuid');
const getBrowser = require('./browser.service');

const searchAmazonService = ({ data }) => {
  const checkURL = data?.includes(`https://`);
  return checkURL ? searchAmazonPage({ data }) : searchAmazonItems({ data });
};

const searchAmazonPage = async ({ data }) => {
  const searchTerm = data;

  const id = uuidv4();

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto(searchTerm);

  await page.waitForLoadState('domcontentloaded');

  // The image src attribute might be in the own imgTagWrapperId or in the children
  let imgPath;
  try {
    imgPath = await page?.$eval('#imgTagWrapperId', (imgEl) => {
      let imgPathInsideWrapper = imgEl?.getAttribute('src');
      if (!imgPathInsideWrapper) {
        imgPathInsideWrapper = imgEl?.firstElementChild?.getAttribute('src');
      }
      return imgPathInsideWrapper;
    });
  } catch (err) {
    console.error('Error finding image', err);
  }

  let title;
  try {
    title = await page?.$eval('#productTitle', (title) =>
      title?.textContent?.trim()
    );
  } catch (err) {
    console.error('Error getting title', err);
  }

  let ratingVotes;
  try {
    ratingVotes = await page?.$eval('#averageCustomerReviews', (ratingsEl) => {
      const ratingStars = ratingsEl
        ?.querySelector('#acrPopover')
        ?.getAttribute('title');
      const ratingVotes = ratingsEl?.querySelector(
        '#acrCustomerReviewText'
      )?.textContent;
      return ratingStars ? { ratingStars, ratingVotes } : false;
    });
  } catch (err) {
    console.error('err', err);
  }

  let price;
  try {
    price = await page?.$eval('#apex_desktop', (item) => {
      const priceElement = item?.querySelector(
        '.a-price.apexPriceToPay,.a-price.priceToPay'
      );
      const price = priceElement?.firstElementChild?.textContent;
      const discountPercentage = item?.querySelector(
        '.reinventPriceSavingsPercentageMargin,.savingsPercentage'
      )?.textContent;

      // Since we get doubled the price per unit amount, we delete the first XX,XX€
      const pricePerUnit = priceElement?.nextElementSibling?.textContent
        ?.trim()
        .replace(/(\d)+,(\d)+(\u20AC)/, '');

      // Some items dont have a price per unit and can get a lot of random data, so we filter looking for the € symbol.
      const checkingForEuros = pricePerUnit?.includes('€');

      return {
        price: price ? price : false,
        pricePerUnit: checkingForEuros ? pricePerUnit : false,
        discount: discountPercentage ? discountPercentage : false,
      };
    });
  } catch (err) {
    console.error('Error getting the price', err);
  }

  let delivery;
  try {
    // We target both, primary and secondary delivery blocks
    delivery = await page?.$eval(
      '#mir-layout-DELIVERY_BLOCK',
      (deliveryBlock) => {
        const primaryDelivery = deliveryBlock
          ?.querySelector(
            '#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE'
          )
          ?.firstElementChild?.textContent?.trim();

        const secondaryDelivery = deliveryBlock
          ?.querySelector(
            '#mir-layout-DELIVERY_BLOCK-slot-SECONDARY_DELIVERY_MESSAGE_LARGE'
          )
          ?.firstElementChild?.textContent?.trim();

        return { primaryDelivery, secondaryDelivery };
      }
    );
  } catch (err) {
    console.error('Error getting delivery info', err);
  }

  let stock;
  try {
    stock = await page?.$eval('#availability', (stockEl) =>
      stockEl?.firstElementChild?.textContent?.trim()
    );
    if (
      stock?.trim() === 'Temporalmente sin stock.' ||
      stock?.trim() === 'No disponible.'
    )
      stock = false;
  } catch (err) {
    console.error('Error getting stock', err);
  }

  let infoSeller;
  try {
    // It might be a different ID depending on the seller. (In the return we gotta trim the result for the seller info in the merchant-info elements)
    infoSeller = await page?.$eval(
      '.tabular-buybox-container,#merchant-info',
      (item) => item.textContent?.trim().replace(/(\s)+/g, ' ')
    );
  } catch (err) {
    console.error('Error getting the seller info', err);
  }

  await browser.close();
  return {
    id,
    image: imgPath,
    name: title,
    itemRate: ratingVotes,
    price: price?.price,
    pricePerUnit: price?.pricePerUnit,
    priceDiscount: price?.discount,
    delivery: delivery ? delivery : false,
    infoSeller: infoSeller ? infoSeller : false,
    availability: stock ? stock : false,
    url: searchTerm,
  };
};

const searchAmazonItems = async ({ data }) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto(`https://www.amazon.es/s?k=${data}`);

  await page.waitForLoadState('domcontentloaded');

  const listItems = await page?.$$eval('.s-card-container', (items) => {
    return items.map((item) => {
      // The URL from href attribute already comes with the slash '/'
      const itemUrl = `https://www.amazon.es${item
        .querySelector('.s-product-image-container')
        ?.firstElementChild?.firstElementChild?.getAttribute('href')}`;

      const imgUrl = item?.querySelector('.s-image')?.getAttribute('src');

      const itemTitle = item?.querySelector(
        '.s-line-clamp-1,.s-line-clamp-2,.s-line-clamp-3,.s-line-clamp-4'
      )?.firstElementChild?.firstElementChild?.textContent;

      const ratingsElement = item.querySelector(
        '.a-row.a-size-small'
      )?.firstElementChild;
      const ratingStars = ratingsElement?.getAttribute('aria-label');
      const ratingVotes =
        ratingsElement?.nextElementSibling?.getAttribute('aria-label');
      const itemRates = ratingStars ? { ratingStars, ratingVotes } : false;

      // Should get ONLY 2 elements to get PVP (price) and PVPR (recommendedPrice)
      const [pvp, pvpr] = item?.querySelectorAll('.a-price');
      const price = pvp?.firstElementChild?.textContent;
      const recommendedPrice = pvpr?.firstElementChild?.textContent;

      // If there is no item price, there is no stock
      if (!pvp)
        return {
          url: itemUrl,
          image: imgUrl,
          name: itemTitle,
          itemRates,
          price: false,
          recommendedPrice: false,
          availability: false,
        };

      const hasPrime = !!item?.querySelector(
        '.aok-inline-block.s-image-logo-view'
      );

      const deliveryElement = item.querySelector(
        '.a-row.a-size-base.a-color-secondary.s-align-children-center'
      );

      // Getting the date depending if it has prime delivery or not.
      let deliveryDate;
      if (hasPrime) {
        deliveryDate =
          deliveryElement?.firstElementChild?.firstElementChild?.nextElementSibling?.getAttribute(
            'aria-label'
          );
      } else {
        deliveryDate =
          deliveryElement?.firstElementChild?.firstElementChild?.getAttribute(
            'aria-label'
          );
      }

      // There are products that the options for the delivery are specified in the textcontent (when it says => Envío GRATIS en tu primer pedido elegible.) instead of the aria-label attribute.
      let deliveryOptions =
        deliveryElement?.firstElementChild?.nextElementSibling?.firstElementChild?.getAttribute(
          'aria-label'
        );
      if (!deliveryOptions && deliveryDate) {
        deliveryOptions =
          deliveryElement?.firstElementChild?.nextElementSibling
            ?.firstElementChild?.textContent;
      }

      const moreBuyOptions = item.querySelector(
        '.a-section.a-spacing-none.a-spacing-top-mini'
      );

      // Could separate in an if statement to only execute when moreBuyOptions is true. Need to extract outside the if scope both variables in order to return'em.
      const moreBuyOptionsPrice =
        moreBuyOptions?.firstElementChild?.getElementsByClassName(
          'a-color-base'
        )[0]?.textContent;

      const moreBuyOptionsQuantityOffers =
        moreBuyOptions?.firstElementChild?.getElementsByClassName(
          'a-declarative'
        )[0]?.firstElementChild?.textContent;

      // This could be renamed to lastUnits
      // Checking if there is low stock for the product. If this is undefined, it means its OK in stock terms.
      let lowStock =
        deliveryElement?.nextElementSibling?.firstElementChild?.getAttribute(
          'aria-label'
        );
      if (
        lowStock?.trim() === 'Temporalmente sin stock.' ||
        lowStock?.trim() === 'No disponible.'
      )
        lowStock = 'No stock';

      // Getting the discounted/top products. This selector might conflict with the one used for 'Opción Amazon/Amazon choice'
      let extraInfo =
        item?.querySelector('.a-text-ellipsis')?.firstElementChild?.textContent;
      if (!extraInfo || extraInfo.includes('Opción')) {
        extraInfo = false;
      }

      return {
        url: itemUrl,
        image: imgUrl,
        name: itemTitle,
        itemRates,
        price: price,
        recommendedPrice: recommendedPrice,
        prime: hasPrime,
        deliveryDate:
          !deliveryDate && !deliveryOptions
            ? false
            : {
                deliveryDate,
                deliveryOptions,
              },
        moreBuyOptions:
          !moreBuyOptionsPrice && !moreBuyOptionsQuantityOffers
            ? false
            : {
                price: moreBuyOptionsPrice,
                quantity: moreBuyOptionsQuantityOffers,
              },
        availability: !lowStock
          ? true
          : lowStock === 'No stock'
          ? false
          : lowStock,
        extraInfo,
      };
    });
  });

  await browser.close();

  return listItems.map((item) => {
    const id = uuidv4();
    return { ...item, id };
  });
};

module.exports = searchAmazonService;
