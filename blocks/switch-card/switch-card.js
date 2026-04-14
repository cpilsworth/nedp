export default async function decorate(block) {
  const rows = [...block.children];
  // Row 0: heading row — leave as-is
  // Row 1 & 2: card rows (icon cell + text cell)
  // Row 3: promo row

  // Identify the card rows (rows with 2 cells: icon + text)
  const cardRows = [];
  const otherRows = [];

  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (index === 0) {
      // heading row
      otherRows.push({ type: 'heading', row });
    } else if (index === rows.length - 1) {
      // last row is the promo
      row.classList.add('promo-row');
      otherRows.push({ type: 'promo', row });
    } else if (cells.length === 2) {
      // card row: cell 0 = icon image, cell 1 = text content
      cardRows.push(row);
    } else {
      otherRows.push({ type: 'other', row });
    }
  });

  // Wrap card rows in a container for side-by-side layout
  if (cardRows.length > 0) {
    const container = document.createElement('div');
    container.classList.add('cards-container');

    cardRows.forEach((row) => {
      const cells = [...row.children];
      const cardDiv = document.createElement('div');
      cardDiv.classList.add('card-item');

      // Icon cell
      const iconCell = cells[0];
      const iconDiv = document.createElement('div');
      iconDiv.classList.add('card-icon');
      iconDiv.innerHTML = iconCell.innerHTML;
      cardDiv.appendChild(iconDiv);

      // Text cell
      const textCell = cells[1];
      cardDiv.innerHTML += textCell.innerHTML;

      container.appendChild(cardDiv);
    });

    // Insert the container after the heading row
    const headingRow = otherRows.find((o) => o.type === 'heading');
    if (headingRow) {
      headingRow.row.after(container);
    } else {
      block.prepend(container);
    }

    // Remove original card rows
    cardRows.forEach((row) => row.remove());
  }
}
