export default async function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  // First row is the heading — leave it in place
  const headingRow = rows[0];

  // Remaining rows are card data
  const cardRows = rows.slice(1);

  // Create a grid container
  const grid = document.createElement('div');
  grid.className = 'oc-grid';

  cardRows.forEach((row) => {
    const cells = [...row.children];
    // cell 0 = image, cell 1 = text (h3 + p), cell 2 = link

    const card = document.createElement('a');
    card.className = 'oc-card';

    // Extract link href
    const link = cells[2]?.querySelector('a');
    card.href = link ? link.getAttribute('href') : '#';

    // Icon with blob background
    const iconWrap = document.createElement('div');
    iconWrap.className = 'oc-icon-wrap';
    const img = cells[0]?.querySelector('img');
    if (img) {
      const icon = document.createElement('img');
      icon.src = img.src;
      icon.alt = img.alt || '';
      iconWrap.appendChild(icon);
    }
    card.appendChild(iconWrap);

    // Title and subtitle
    const h3 = cells[1]?.querySelector('h3');
    if (h3) {
      const title = document.createElement('h3');
      title.textContent = h3.textContent;
      card.appendChild(title);
    }

    const p = cells[1]?.querySelector('p');
    if (p) {
      const sub = document.createElement('p');
      sub.textContent = p.textContent;
      card.appendChild(sub);
    }

    // Arrow icon
    const arrow = document.createElement('img');
    arrow.className = 'oc-arrow';
    arrow.src = '/drafts/images/right-arrow-green1.svg';
    arrow.alt = '';
    card.appendChild(arrow);

    grid.appendChild(card);

    // Remove original row
    row.remove();
  });

  block.appendChild(grid);
}
