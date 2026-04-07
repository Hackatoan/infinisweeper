const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// 1. Fix revealInitialZeros to cover the full viewport including EXTRA_CELLS
code = code.replace(
  `function revealInitialZeros() {
  const { rows, cols } = getViewportSize();
  for (let i = offsetY; i < offsetY + rows; i++) {
    for (let j = offsetX; j < offsetX + cols; j++) {`,
  `function revealInitialZeros() {
  const { rows, cols } = getViewportSize();
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i - EXTRA_CELLS;
      const col = offsetX + j - EXTRA_CELLS;`
);

code = code.replace(
  `      if (board[\`\${i},\${j}\`] && !board[\`\${i},\${j}\`].isMine && calculateAdjacentMines(i, j) === 0) {
        revealAdjacentZeros(i, j);
      }`,
  `      const key = \`\${row},\${col}\`;
      if (!board[key]) {
        board[key] = createCell(row, col);
      }
      if (!board[key].isMine && !board[key].isRevealed && calculateAdjacentMines(row, col) === 0) {
        revealAdjacentZeros(row, col);
      }`
);

// 2. Add drag state variables
code = code.replace(
  `let gameOver = false;`,
  `let gameOver = false;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let panX = 0;
let panY = 0;
let hasDragged = false;`
);

// 3. Update updateBoardView to apply the CSS transform
code = code.replace(
  `function updateBoardView() {
  const { rows, cols } = getViewportSize();
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = \`repeat(\${cols}, \${cellSize}px)\`;
  boardContainer.style.gridTemplateRows = \`repeat(\${rows}, \${cellSize}px)\`;`,
  `function updateBoardView() {
  const { rows, cols } = getViewportSize();
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = \`repeat(\${cols}, \${cellSize}px)\`;
  boardContainer.style.gridTemplateRows = \`repeat(\${rows}, \${cellSize}px)\`;
  boardContainer.style.transform = \`translate(\${panX}px, \${panY}px)\`;`
);

// 4. Update the context menu listener to handle dragging
code = code.replace(
  `  boardContainer.addEventListener("contextmenu", (e) => {
    const cell = e.target.closest(".cell");
    if (cell) {
      handleCellRightClick(e, parseInt(cell.dataset.row), parseInt(cell.dataset.col));
    }
  });`,
  `  boardContainer.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // Prevent default immediately
    if (hasDragged) return; // Ignore right-click action if it was a drag
    const cell = e.target.closest(".cell");
    if (cell) {
      handleCellRightClick(e, parseInt(cell.dataset.row), parseInt(cell.dataset.col));
    }
  });

  // Drag logic
  boardContainer.addEventListener("mousedown", (e) => {
    if (e.button === 2) { // Right click
      isDragging = true;
      hasDragged = false;
      startDragX = e.clientX;
      startDragY = e.clientY;
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startDragX;
    const dy = e.clientY - startDragY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDragged = true;
    }

    panX += dx;
    panY += dy;

    startDragX = e.clientX;
    startDragY = e.clientY;

    let moved = false;
    if (Math.abs(panX) >= cellSize) {
      const shiftCols = Math.floor(panX / cellSize) + (panX < 0 && panX % cellSize !== 0 ? 1 : 0);
      offsetX -= shiftCols;
      panX -= shiftCols * cellSize;
      moved = true;
    }
    if (Math.abs(panY) >= cellSize) {
      const shiftRows = Math.floor(panY / cellSize) + (panY < 0 && panY % cellSize !== 0 ? 1 : 0);
      offsetY -= shiftRows;
      panY -= shiftRows * cellSize;
      moved = true;
    }

    if (moved) {
      revealInitialZeros();
      updateBoardView();
    } else {
      document.getElementById("board").style.transform = \`translate(\${panX}px, \${panY}px)\`;
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      isDragging = false;
    }
  });`
);


// 5. Ensure grid offsets are correctly computed during drag
code = code.replace(
  `const shiftCols = Math.floor(panX / cellSize) + (panX < 0 && panX % cellSize !== 0 ? 1 : 0);`,
  `const shiftCols = Math.trunc(panX / cellSize);`
).replace(
  `const shiftRows = Math.floor(panY / cellSize) + (panY < 0 && panY % cellSize !== 0 ? 1 : 0);`,
  `const shiftRows = Math.trunc(panY / cellSize);`
);

// Write changes back
fs.writeFileSync('public/script.js', code);
console.log('Patch applied successfully.');
