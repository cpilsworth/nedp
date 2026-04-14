export default async function decorate(block) {
  const rows = [...block.children];
  // First row is the heading row (title + "See all" link) — leave as-is

  // Remaining rows are card rows — wrap them in a grid container
  const cardRows = rows.slice(1);
  const grid = document.createElement('div');
  grid.className = 'promo-cards-grid';

  cardRows.forEach((row) => {
    const cells = [...row.children];
    // cell 0 = image, cell 1 = text content
    const card = document.createElement('div');
    card.className = 'promo-card';

    // Image
    const imgCell = cells[0];
    if (imgCell) {
      const img = imgCell.querySelector('img');
      if (img) {
        card.appendChild(img);
      }
    }

    // Body content
    const textCell = cells[1];
    if (textCell) {
      const body = document.createElement('div');
      body.className = 'promo-card-body';
      body.innerHTML = textCell.innerHTML;
      card.appendChild(body);
    }

    grid.appendChild(card);
    row.remove();
  });

  block.appendChild(grid);
}
