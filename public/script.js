// Client‑side logic for Roast Your Job

// Configuration of possible variants.  Each product can specify size and
// colour options.  If an array is empty or undefined, that option is
// omitted from the form.
const variantOptions = {
  sticker: {},
  mug: { size: ['11oz', '15oz'], color: ['white', 'black'] },
  tee: { size: ['S', 'M', 'L', 'XL'], color: ['white', 'black'] },
  mousepad: {},
  pillow: { size: ['18x18'], color: ['white', 'black'] },
  poster: { size: ['A3', 'A2'], color: [] },
};

const roastForm = document.getElementById('roastForm');
const roastResult = document.getElementById('roastResult');
const roastTextEl = document.getElementById('roastText');
const stickerImgEl = document.getElementById('stickerImg');
const merchForm = document.getElementById('merchForm');
const productSelect = document.getElementById('product');
const variantDiv = document.getElementById('variantOptions');
const buyButton = document.getElementById('buyButton');
const errorEl = document.getElementById('error');

// Build variant selectors when the product changes
productSelect.addEventListener('change', () => {
  buildVariantSelectors();
});

function buildVariantSelectors() {
  const product = productSelect.value;
  const opts = variantOptions[product] || {};
  variantDiv.innerHTML = '';
  // size select
  if (opts.size && opts.size.length) {
    const label = document.createElement('label');
    label.textContent = 'Size';
    const select = document.createElement('select');
    select.id = 'variantSize';
    opts.size.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    label.appendChild(select);
    variantDiv.appendChild(label);
  }
  // colour select
  if (opts.color && opts.color.length) {
    const label = document.createElement('label');
    label.textContent = 'Colour';
    const select = document.createElement('select');
    select.id = 'variantColour';
    opts.color.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    label.appendChild(select);
    variantDiv.appendChild(label);
  }
}

// Generate roast and sticker
roastForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const job = document.getElementById('job').value.trim();
  const style = document.getElementById('style').value.trim();
  if (!job) return;
  try {
    // Call the Netlify function
    const res = await fetch('/.netlify/functions/generateRoast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, style }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    roastTextEl.textContent = data.roast;
    if (data.sticker) {
      stickerImgEl.src = `data:image/png;base64,${data.sticker}`;
    }
    roastResult.classList.remove('hidden');
    merchForm.classList.remove('hidden');
    buildVariantSelectors();
    // Store roast and style for later use
    roastResult.dataset.roast = data.roast;
    roastResult.dataset.style = style;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Something went wrong.';
  }
});

// Handle merch purchase
buyButton.addEventListener('click', async () => {
  errorEl.textContent = '';
  const product = productSelect.value;
  const roast = roastResult.dataset.roast || '';
  const style = roastResult.dataset.style || '';
  // Gather variant options
  const sizeEl = document.getElementById('variantSize');
  const colourEl = document.getElementById('variantColour');
  const size = sizeEl ? sizeEl.value : '';
  const color = colourEl ? colourEl.value : '';
  try {
    const res = await fetch('/.netlify/functions/createMerchCheckout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, size, color, roast, style }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Unable to create checkout session.';
  }
});
