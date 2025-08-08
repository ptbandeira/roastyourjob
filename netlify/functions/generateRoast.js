/*
 * generateRoast
 *
 * This serverless function accepts a job title and a chosen art style and
 * returns a playful roast along with a base64 PNG sticker.  It calls
 * OpenAI’s Chat API and Images API.  The output is intentionally short
 * to control token usage – adjust the prompt or max_tokens as needed.
 */

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
  const job = (body.job || '').trim();
  const style = (body.style || '').trim();
  if (!job) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job title' }) };
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const chatModel = process.env.MODEL || 'gpt-4o';
    const imageModel = process.env.IMAGE_MODEL || 'dall-e-3';
    // Compose a playful prompt.  We ask for a two sentence roast to keep it concise.
    const systemMessage = {
      role: 'system',
      content:
        'You are a witty assistant who roasts people\'s jobs in a light‑hearted way. Keep it playful and avoid offence.',
    };
    const userMessage = {
      role: 'user',
      content: `Write a roast in two sentences (maximum 100 words) about the job title: ${job}. Make it humourous but friendly.`,
    };
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [systemMessage, userMessage],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });
    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`Chat API error: ${chatResponse.status}: ${errText}`);
    }
    const chatData = await chatResponse.json();
    const roast = (chatData.choices && chatData.choices[0] && chatData.choices[0].message && chatData.choices[0].message.content) || '';
    // Generate an image.  The prompt hints at sticker style and chosen user style.
    const imagePrompt = `A modern vector sticker illustration representing the job \"${job}\" in ${style || 'vibrant'} style, flat design, colourful, no text`;
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: imagePrompt,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      }),
    });
    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      throw new Error(`Image API error: ${imageResponse.status}: ${errText}`);
    }
    const imageData = await imageResponse.json();
    const sticker =
      imageData && imageData.data && imageData.data[0] && imageData.data[0].b64_json;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roast: roast.trim(), sticker }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
