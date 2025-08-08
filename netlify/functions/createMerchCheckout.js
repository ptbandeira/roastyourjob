/*
 * createMerchCheckout
 *
 * Creates a one‑time Stripe Checkout Session for the selected merch item.  The
 * client posts the product and any options (e.g. size, colour) as JSON.  The
 * function looks up the corresponding Printful variant ID and price from
 * environment variables.  It then builds a checkout session with Stripe and
 * returns the session URL.  The actual fulfilment is handled in
 * `stripeWebhook`.
 */

const Stripe = require('stripe');

// Build a key for variant and price environment variables.  For example:
// product = 'mug', options = { size: '11oz', colour: 'white' }
// -> variantEnv = PRINTFUL_MUG_11OZ_WHITE_VARIANT
// -> priceEnv   = PRICE_MUG_11OZ_WHITE_EUR
function buildEnvKeys(product, options) {
  const parts = [product];
  if (options && options.size) parts.push(options.size);
  if (options && options.color) parts.push(options.color);
  // normalise: uppercase and replace non‑alphanumerics with underscores
  const normalized = parts
    .filter(Boolean)
    .map((p) =>
      String(p)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
    )
    .join('_');
  return {
    variant: `PRINTFUL_${normalized}_VARIANT`,
    price: `PRICE_${normalized}_EUR`,
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const product = (body.product || '').trim();
  const options = {
    size: body.size || '',
    color: body.color || '',
  };
  const roast = body.roast || '';
  const style = body.style || '';
  if (!product) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing product' }) };
  }
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-08-16' });
    const { variant: variantEnv, price: priceEnv } = buildEnvKeys(product, options);
    const variantId = process.env[variantEnv];
    const priceStr = process.env[priceEnv];
    if (!variantId || !priceStr) {
      throw new Error(
        `No variant or price configured for ${product} with options: ${JSON.stringify(
          options
        )}`
      );
    }
    const priceEur = Number(priceStr);
    if (isNaN(priceEur)) {
      throw new Error(`Price for ${priceEnv} is not a number: ${priceStr}`);
    }
    // Prepare line item.  Stripe expects unit_amount in cents.
    const unitAmount = Math.round(priceEur * 100);
    const productName = `${product.charAt(0).toUpperCase() + product.slice(1)} merch`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: roast.slice(0, 200),
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL_HOST}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL_HOST}/?canceled=1`,
      metadata: {
        product,
        variant: variantId,
        size: options.size || '',
        color: options.color || '',
        roast: roast.slice(0, 500),
        style: style,
      },
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
