/*
 * stripeWebhook
 *
 * This serverless function receives Stripe webhook events.  It verifies the
 * signature and responds to `checkout.session.completed` by triggering
 * fulfilment.  The fulfilment logic is deliberately left as a placeholder
 * because it depends on your Printful products and how you want to attach
 * artwork.  See the README for details.
 */

const Stripe = require('stripe');

exports.handler = async function (event) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    return {
      statusCode: 500,
      body: 'Stripe secrets are not configured',
    };
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: '2023-08-16' });
  const signature = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
  // Handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const metadata = session.metadata || {};
    // The metadata includes: product, variant id, size, colour, roast and style.
    // At this point you would create an order with Printful.  A complete
    // implementation might:
    //   1. Regenerate or retrieve the sticker artwork corresponding to this order.
    //   2. Call the Printful API to submit an order with the proper variant ID,
    //      shipping address (from session.shipping_details), and artwork file.
    //   3. Optionally send a confirmation email to the customer.
    // For now we simply log the metadata and return a 200 response.
    console.log('Order paid:', metadata);
    // TODO: implement Printful integration here
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
