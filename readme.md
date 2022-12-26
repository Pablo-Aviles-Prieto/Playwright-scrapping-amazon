## 💻 Amazon web scrapper

Project to play around with web scrapping on the amazon page using playwright.

_This is almost the same snippet I use in the [www.encuentraonline.es](https://www.encuentraonline.es/) project I made along with a friend._

## 📦 Installation

Clone the repository and install its dependencies running:

> npm install

## 🔑 Steps to make it run

1.  After installing the dependencies, you need to start the server with either:

```javascript
 $ npm run dev // with nodemon
 $ npm run start // default
```

2.  The endpoint to obtain the JSON data from the scrap service is `http://localhost:4000/amazon?data={URL/SEARCH TERM}`

- You provide to the data param, the URL or the terms you want to look up.
- Depending on the data provided to the `data param`, it returns an `array of objects` (search term) or a `single object` (URL)
- By default, is running on the port `4000`

  _For example_ `http://localhost:4000/amazon?data=graphic cards`_would retrieve the first page from the amazon search page for_ `graphic cards`

## 🎭 Debug info

- On the `browser.service.js` file, you can set the `headless` option to `false` to open the chromium browser in case you want to debug the scrapping using `console.log` and see what kind of data you get.

```javascript
chromium.launch({
  headless: false,
  args: ['--no-sandbox'],
  chromiumSandbox: false,
});
```

- As side note, when setting the `headless` option to `false`, you might need to add more information about the `User-Agent` or other options sent in the headers request by the `chromium browser`, so the web page doesn't treat you as a bot and you can avoid the `captcha`.
