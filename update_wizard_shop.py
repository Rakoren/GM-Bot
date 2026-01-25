from pathlib import Path
path = Path('admin/public/wizard.js')
text = path.read_text()
start = text.find('function parseGoldCost')
end = text.find('function showMessage')
if start == -1 or end == -1:
    raise SystemExit('markers missing')
new_block = '''function parseGoldCost(cost) {
  if (!cost) return 0;
  const cleaned = String(cost || '').replace(/,/g, '');
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
  const unitMatch = cleaned.match(/(gp|sp|cp|pp)/i);
  const amount = match ? Number(match[1]) || 0 : 0;
  const unit = unitMatch ? unitMatch[1].toLowerCase() : 'gp';
  const multiplier = unit === 'sp' ? 0.1 : unit === 'cp' ? 0.01 : unit === 'pp' ? 10 : 1;
  return amount * multiplier;
}

function addGearToCart(item) {
  if (!item?.name) return;
  const existing = gearCart.find(entry => entry.name === item.name && entry.cost === item.cost);
  if (existing) {
    existing.qty += 1;
  } else {
    gearCart.push({ name: item.name, cost: item.cost, qty: 1 });
  }
  updateCartDisplay();
}

function removeGearFromCart(index) {
  const entry = gearCart[index];
  if (!entry) return;
  if (entry.qty > 1) {
    entry.qty -= 1;
  } else {
    gearCart.splice(index, 1);
  }
  updateCartDisplay();
}

function renderCartRows() {
  if (!shopCartEl) return;
  if (!gearCart.length) {
    shopCartEl.textContent = 'No gear selected.';
    return;
  }
  shopCartEl.innerHTML = '';
  gearCart.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    const label = document.createElement('span');
    const costText = entry.cost ?  () : '';
    label.textContent = ${entry.name} x;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeGearFromCart(idx));
    row.appendChild(label);
    row.appendChild(removeBtn);
    shopCartEl.appendChild(row);
  });
}

function updateCartDisplay() {
  const baseGold = Number(startingGoldInput?.value) || 0;
  let total = 0;
  gearCart.forEach(entry => {
    const cost = parseGoldCost(entry.cost);
    total += (cost || 0) * entry.qty;
  });
  const remaining = Math.max(0, baseGold - total);
  if (cartSummaryEl) {
    cartSummaryEl.textContent = gearCart.length
      ? Spent  GP of  GP (remaining  GP).
      : Cart is empty. Starting Gold:  GP.;
  }
  if (form?.elements?.gold_spent) {
    form.elements.gold_spent.value = total.toFixed(2);
  }
  if (form?.elements?.gear_cart) {
    form.elements.gear_cart.value = gearCart
      .map(entry => ${entry.qty}×  ())
      .join('; ');
  }
  renderCartRows();
}

function renderGearList(filter = '') {
  if (!gearListEl) return;
  const query = String(filter || '').trim().toLowerCase();
  const filtered = (gearItems || [])
    .filter(item => !query
      || item.name?.toLowerCase().includes(query)
      || String(item.cost || '').toLowerCase().includes(query))
    .slice(0, 40);
  gearListEl.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.textContent = 'No gear matches that search.';
    gearListEl.appendChild(empty);
    return;
  }
  filtered.forEach(item => {
    const row = document.createElement('div');
    row.className = 'gear-item';
    const info = document.createElement('span');
    const weight = item.weight ? ,  : '';
    info.textContent = ${item.name} — ;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Add';
    button.addEventListener('click', () => addGearToCart(item));
    row.appendChild(info);
    row.appendChild(button);
    gearListEl.appendChild(row);
  });
}

'''
path.write_text(text[:start] + new_block + text[end:])
