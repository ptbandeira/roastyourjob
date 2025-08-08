# Roast Your Job

A playful microsite that lets visitors generate an AI‑powered roast of their job, then purchase custom merchandise featuring their roast and a generated sticker.  The site is designed to run for free on the Netlify hobby tier and uses serverless functions to call OpenAI, Stripe and Printful only when needed.

## Getting Started

1. **Clone and deploy.**  Push this repository to GitHub and connect it to Netlify.  Netlify will detect the `netlify` directory and automatically deploy your static site and serverless functions.  You can use the free `*.netlify.app` subdomain, or add a custom domain later.
2. **Set environment variables.**  In Netlify’s UI set the following variables so the functions can authenticate with the APIs:

   - `OPENAI_API_KEY` – your OpenAI key.  Used by `generateRoast` to produce the roast and sticker.
   - `STRIPE_SECRET_KEY` – your Stripe secret.  Used by `createMerchCheckout` to generate a checkout session.
   - `STRIPE_WEBHOOK_SECRET` – the signing secret for your Stripe webhook.  Configure a webhook in Stripe pointing to `/.netlify/functions/stripeWebhook` and copy the signing secret here.
   - `PRINTFUL_API_KEY` – your Printful API token.  Used by `stripeWebhook` to place orders after payment.
   - `URL_HOST` – your site’s full URL (e.g. `https://roastyourjob.netlify.app`).  Used for redirect URLs.

   For each merch variant you want to sell, add the corresponding Printful variant ID and your selling price.  For example:

   ```bash
   PRINTFUL_STICKER_VARIANT=00000
   PRICE_STICKER_EUR=7
   PRINTFUL_MUG11_WHITE_VARIANT=00001
   PRICE_MUG11_WHITE_EUR=12
   PRINTFUL_TSHIRT_UNISEX_M_WHITE_VARIANT=00002
   PRICE_TSHIRT_UNISEX_M_WHITE_EUR=22
   PRINTFUL_POSTER_A3_VARIANT=00003
   PRICE_POSTER_A3_EUR=15
   ```

   The naming convention for variant env vars is `PRINTFUL_{PRODUCT}_{OPTION1}_{OPTION2}_VARIANT` and the price is `PRICE_{PRODUCT}_{OPTION1}_{OPTION2}_EUR`.  Products without options (e.g. stickers) omit the option parts.

3. **Test locally.**  You can test the functions locally with [Netlify CLI](https://docs.netlify.com/cli/get-started/).  Install it with `npm install -g netlify-cli` then run `netlify dev` in this folder.  The static site is served from `public/` and functions from `netlify/functions`.
4. **Deploy.**  Once environment variables are set and you’ve tested locally, push to GitHub and Netlify will redeploy automatically.  Payments will go live when you switch your Stripe keys to live mode.

## How it works

1. **Generate roast and sticker.**  Visitors enter their job title and choose a sticker style.  The client side posts this data to `/.netlify/functions/generateRoast` which calls OpenAI’s Chat API to generate a short roast and the images API to create a sticker.  The function returns the roast text and a base64‑encoded PNG sticker.

2. **Show merch options.**  After the roast appears, the visitor can pick a product (sticker, mug, shirt, poster, etc.) along with size/colour options.  These choices are sent to `createMerchCheckout` which looks up the corresponding Printful variant ID and price from environment variables, creates a one–time Stripe checkout session and returns the URL.  The browser then redirects the user to Stripe Checkout.

3. **Fulfil the order.**  After payment, Stripe calls the `stripeWebhook` function.  The webhook verifies the signature, reads the purchase metadata (including the job roast and style), regenerates or fetches the sticker if necessary, and submits an order to Printful via their API.  You receive funds in Stripe; Printful bills you separately for fulfilment, so there is no upfront cost or inventory.

## Caveats

This repository provides a working skeleton.  You may need to adapt it for your specific use case, such as adding more style choices, rate limiting free roasts, or handling edge cases in the webhook.  See the comments in the functions for guidance.
