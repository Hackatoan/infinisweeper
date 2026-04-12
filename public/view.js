// Constants
const MINE_DENSITY = 0.2;
const DEBOUNCE_DELAY = 600;
const CELL_FLAG = "&#9873;";
const MAX_COLS = 10;
const MAX_ROWS = 10;
const EXTRA_CELLS = 2; // Number of extra cells around the visible area

// Game State
let board = {};
let offsetX = 0;
let offsetY = 0;
let cellSize = calculateCellSize();
let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };
let score = 0;
let gameOver = false;
let isSubmitting = false; // Track submission state
let gameSeed = Math.random() * 10000;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let panX = 0;
let panY = 0;
let hasDragged = false;

// Debounced Functions
const debouncedSaveGameState = debounce(saveGameState, DEBOUNCE_DELAY);

// Event Listeners
document.addEventListener("keydown", handleKeyEvents);
window.addEventListener("resize", onResize);
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

// Function to calculate cell size
function calculateCellSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return Math.min(width / MAX_COLS, height / MAX_ROWS);
}

// Main Functions
function createBoard() {
  const { rows, cols } = getViewportSize();
  const boardContainer = document.getElementById("board");

  const expectedChildrenCount = rows * cols;
  const canReuse = boardContainer.children.length === expectedChildrenCount;

  if (!canReuse) {
    boardContainer.innerHTML = "";
    boardContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    boardContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    boardContainer.style.top = `-${EXTRA_CELLS * (cellSize + 1)}px`;
    boardContainer.style.left = `-${EXTRA_CELLS * (cellSize + 1)}px`;
  }

  boardContainer.style.transform = `translate(${panX}px, ${panY}px)`;

  let childIndex = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i - EXTRA_CELLS;
      const col = offsetX + j - EXTRA_CELLS;

      if (canReuse) {
        const cell = boardContainer.children[childIndex++];
        updateCellElement(cell, row, col);
      } else {
        const cell = createCellElement(row, col);
        boardContainer.appendChild(cell);
      }
    }
  }
}

function updateCellElement(cell, row, col) {
  cell.id = `cell_${row}_${col}`;
  cell.dataset.row = row;
  cell.dataset.col = col;

  cell.className = "cell";
  cell.innerHTML = "";

  if (board[`${row},${col}`]) {
    const cellData = board[`${row},${col}`];
    if (cellData.isRevealed) {
      cell.classList.add("revealed");
      if (cellData.isMine) {
        cell.classList.add("mine");
      } else {
        const adjacentMines = calculateAdjacentMines(row, col);
        cell.innerHTML = adjacentMines > 0 ? adjacentMines : "";
      }
    } else if (cellData.isFlagged) {
      cell.innerHTML = CELL_FLAG;
    }
  } else {
    board[`${row},${col}`] = createCell(row, col);
  }
}

function initializeBoard() {
  resetGameState();
  const { rows, cols } = getViewportSize();
  offsetX = Math.floor(-cols / 2);
  offsetY = Math.floor(-rows / 2);
  startingPosition = { row: Math.floor(rows / 2) + offsetY, col: Math.floor(cols / 2) + offsetX };

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i - EXTRA_CELLS;
      const col = offsetX + j - EXTRA_CELLS;
      if (!board[`${row},${col}`]) {
        board[`${row},${col}`] = createCell(row, col);
      }
    }
  }

  revealInitialZeros();
  updateBoardView();
  saveGameState();
}

function resetGameState() {
  cellSize = calculateCellSize();
  board = {};
  gameSeed = Math.random() * 10000;
  score = 0;
  gameOver = false;
  startingPosition = null;
  lastRevealedPosition = { row: 0, col: 0 };
  document.getElementById("score-overlay").textContent = `Score: ${score}`;
  document.getElementById("toast").style.display = "none";
}

function pseudoRandom(x, y) {
  // Optimized pseudo-random hash using integer arithmetic
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.floor(gameSeed * 1000000);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h >>> 0) / 4294967296.0;
}

function createCell(row, col) {
  const isMine = pseudoRandom(row, col) < MINE_DENSITY;
  return { isMine, isRevealed: false, isFlagged: false, isVisited: false };
}

function revealInitialZeros() {
  const { rows, cols } = getViewportSize();
  for (let i = offsetY; i < offsetY + rows; i++) {
    for (let j = offsetX; j < offsetX + cols; j++) {
      if (board[`${i},${j}`] && !board[`${i},${j}`].isMine && calculateAdjacentMines(i, j) === 0) {
        revealAdjacentZeros(i, j);
      }
    }
  }
}

function revealCell(row, col, directClick = true) {
  if (gameOver || !board[`${row},${col}`] || board[`${row},${col}`].isRevealed || board[`${row},${col}`].isFlagged) return;

  const cell = document.getElementById(`cell_${row}_${col}`);
  if (cell) {
    board[`${row},${col}`].isRevealed = true;
    cell.classList.add("revealed");

    if (board[`${row},${col}`].isMine) {
      cell.classList.add("mine");
      gameOver = true;
      showToast("Game Over! You hit a mine.");
    } else {
      const adjacentMines = calculateAdjacentMines(row, col);
      cell.innerHTML = adjacentMines > 0 ? adjacentMines : "";
      if (adjacentMines === 0) revealAdjacentZeros(row, col, false);
    }

    if (!startingPosition) startingPosition = { row, col };
    lastRevealedPosition = { row, col };
    if (directClick) incrementScore();
    saveGameState();
  }
}

function revealAdjacentZeros(row, col, isAutoDiscover = false) {
  const queue = [{ row, col }];
  const visited = new Set([`${row},${col}`]);
  const cellsToUpdate = [];

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    const key = `${row},${col}`;
    if (board[key].isMine || board[key].isRevealed) continue;

    board[key].isRevealed = true;
    cellsToUpdate.push({ row, col });

    const adjacentMines = calculateAdjacentMines(row, col);
    if (adjacentMines === 0) {
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const newRow = row + di;
          const newCol = col + dj;
          const newKey = `${newRow},${newCol}`;

          if ((di !== 0 || dj !== 0) && isInBounds(newRow, newCol) && !visited.has(newKey)) {
            queue.push({ row: newRow, col: newCol });
            visited.add(newKey);
          }
        }
      }
    }
  }

  cellsToUpdate.forEach(({ row, col }) => {
    const cell = document.getElementById(`cell_${row}_${col}`);
    if (cell) {
      cell.classList.add("revealed");
      const adjacentMines = calculateAdjacentMines(row, col);
      cell.textContent = adjacentMines > 0 ? adjacentMines : "";
    }
  });
}

function toggleFlag(row, col) {
  if (gameOver || !board[`${row},${col}`]) return;
  const cell = document.getElementById(`cell_${row}_${col}`);
  if (cell && !board[`${row},${col}`].isRevealed) {
    board[`${row},${col}`].isFlagged = !board[`${row},${col}`].isFlagged;
    cell.innerHTML = board[`${row},${col}`].isFlagged ? CELL_FLAG : "";
  }
  debouncedSaveGameState();
}

function handleKeyEvents(event) {

  const key = event.key;
  let moved = false;

  switch (key) {
    case "ArrowUp":
    case "w":
      offsetY--;
      moved = true;
      break;
    case "ArrowDown":
    case "s":
      offsetY++;
      moved = true;
      break;
    case "ArrowLeft":
    case "a":
      offsetX--;
      moved = true;
      break;
    case "ArrowRight":
    case "d":
      offsetX++;
      moved = true;
      break;
    case "c":
      if (startingPosition) moveToCenter(startingPosition);
      break;
    case "l":
      moveToCenter(lastRevealedPosition);
      break;
  }

  if (moved) {
    updateBoardView();
    revealInitialZeros();
  }
}

function moveToCenter(position) {
  const { rows, cols } = getViewportSize();
  if (position) {
    offsetX = position.col - Math.floor(cols / 2) + EXTRA_CELLS;
    offsetY = position.row - Math.floor(rows / 2) + EXTRA_CELLS;
  }
  updateBoardView();
}

function saveGameState() {
  const gameState = {
    board,
    offsetX,
    offsetY,
    startingPosition,
    lastRevealedPosition,
    score,
    gameOver,
    gameSeed,
  };
  localStorage.setItem("minesweeperGameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem("minesweeperViewState") || localStorage.getItem("minesweeperGameState");
  if (savedState) {
    const gameState = JSON.parse(savedState);
    board = gameState.board;
    offsetX = gameState.offsetX;
    offsetY = gameState.offsetY;
    startingPosition = gameState.startingPosition;
    lastRevealedPosition = gameState.lastRevealedPosition;
    score = gameState.score;
    gameOver = gameState.gameOver;
    gameSeed = gameState.gameSeed || Math.random() * 10000;

    if (lastRevealedPosition) {
      moveToCenter(lastRevealedPosition);
    } else {
      updateBoardView();
    }
    document.getElementById("score-overlay").textContent = `Score: ${score}`;
    return true;
  }
  return false;
}

function getSaveGameState() {
  return localStorage.getItem("minesweeperGameState") || console.log("error");
}

function getScore() {
  return score;
}

function getUsername() {
  return document.getElementById("username").value.trim();
}

function hideToast() {
  document.getElementById("toast").style.display = "none";
  document.getElementById("submit-score").style.display = "none";
}

function restartGame() {
  hideToast();
  localStorage.removeItem("minesweeperGameState");
  initializeBoard();
}

function getViewportSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cols = Math.floor(width / cellSize) + EXTRA_CELLS * 2;
  const rows = Math.floor(height / cellSize) + EXTRA_CELLS * 2;
  return { rows, cols };
}

function isInBounds(row, col) {
  return board.hasOwnProperty(`${row},${col}`);
}

function calculateAdjacentMines(row, col) {
  let adjacentMines = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      const neighborRow = row + di;
      const neighborCol = col + dj;
      const neighborKey = `${neighborRow},${neighborCol}`;
      if (!board[neighborKey]) {
        board[neighborKey] = createCell(neighborRow, neighborCol);
      }
      if (board[neighborKey].isMine) {
        adjacentMines++;
      }
    }
  }
  return adjacentMines;
}

function updateBoardView() {
  createBoard();
}

function incrementScore() {
  if (gameOver) return;
  score++;
  document.getElementById("score-overlay").textContent = `Score: ${score}`;
  debouncedSaveGameState();
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function onResize() {
  cellSize = calculateCellSize();
  updateBoardView();
}

function onDOMContentLoaded() {
  const gameLoaded = loadGameState();
  if (!gameLoaded) initializeBoard();

  const boardContainer = document.getElementById("board");
  boardContainer.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (cell) {
      // handleCellClick(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
    }
  });
  boardContainer.addEventListener("contextmenu", (e) => {
    const cell = e.target.closest(".cell");
    if (cell) {
      // handleCellRightClick(e, parseInt(cell.dataset.row), parseInt(cell.dataset.col));
    }
  });
  // Drag logic
  boardContainer.addEventListener("mousedown", (e) => {
    if (e.button === 0 || e.button === 2) {
      isDragging = true;
      hasDragged = false;
      startDragX = e.clientX;
      startDragY = e.clientY;
    }
  });

  let initialTouchX = 0;
  let initialTouchY = 0;

  boardContainer.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        hasDragged = false;
        startDragX = e.touches[0].clientX;
        startDragY = e.touches[0].clientY;
        initialTouchX = startDragX;
        initialTouchY = startDragY;
      }
    },
    { passive: false }
  );

  document.addEventListener("mousemove", handleMove);
  document.addEventListener("touchmove", handleMove, { passive: false });

  function handleMove(e) {
    if (!isDragging) return;

    if (e.type === "touchmove") e.preventDefault();

    let clientX, clientY;
    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - startDragX;
    const dy = clientY - startDragY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDragged = true;
    }

    panX += dx;
    panY += dy;

    startDragX = clientX;
    startDragY = clientY;

    let moved = false;
    const effectiveCellSize = cellSize + 1;
    if (Math.abs(panX) >= effectiveCellSize) {
      const shiftCols = Math.trunc(panX / effectiveCellSize);
      offsetX -= shiftCols;
      panX -= shiftCols * effectiveCellSize;
      moved = true;
    }
    if (Math.abs(panY) >= effectiveCellSize) {
      const shiftRows = Math.trunc(panY / effectiveCellSize);
      offsetY -= shiftRows;
      panY -= shiftRows * effectiveCellSize;
      moved = true;
    }

    if (moved) {
      revealInitialZeros();
      updateBoardView();
    } else {
      document.getElementById("board").style.transform = `translate(${panX}px, ${panY}px)`;
    }
  }

  document.addEventListener("mouseup", (e) => {
    if (e.button === 0 || e.button === 2) {
      isDragging = false;
      if (hasDragged) {
        setTimeout(() => (hasDragged = false), 50);
      }
    }
  });

  document.addEventListener("touchend", (e) => {
    isDragging = false;
  });

  document.addEventListener("touchcancel", (e) => {
    isDragging = false;
  });

}

function createCellElement(row, col) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.id = `cell_${row}_${col}`;
  cell.dataset.row = row;
  cell.dataset.col = col;
  cell.style.width = `${cellSize}px`;
  cell.style.height = `${cellSize}px`;

  if (board[`${row},${col}`]) {
    const cellData = board[`${row},${col}`];
    if (cellData.isRevealed) {
      cell.classList.add("revealed");
      if (cellData.isMine) {
        cell.classList.add("mine");
      } else {
        const adjacentMines = calculateAdjacentMines(row, col);
        cell.innerHTML = adjacentMines > 0 ? adjacentMines : "";
      }
    } else if (cellData.isFlagged) {
      cell.innerHTML = CELL_FLAG;
    }
  } else {
    board[`${row},${col}`] = createCell(row, col);
  }

  return cell;
}

function handleCellClick(row, col) {
  if (calculateAdjacentMines(row, col) === 0) {
    revealAdjacentZeros(row, col);
  } else {
    revealCell(row, col);
  }
  updateBoardView();
}

function handleCellRightClick(event, row, col) {
  event.preventDefault();
  toggleFlag(row, col);
}

function submitScore() {
  if (isSubmitting) return;
  isSubmitting = true;

  const now = new Date();
  db.collection("leaderboard")
    .add({
      uid: firebase.auth().currentUser.uid,
      name: getUsername(),
      score: getScore(),
      date: firebase.firestore.Timestamp.fromDate(now),
      gamestate: getSaveGameState(),
    })
    .then(() => {
      document.getElementById("username").value = "";
      showToast("Score submitted successfully!");
      isSubmitting = false;
      gotoLeaderboard();
    })
    .catch((error) => {
      console.error("Error adding document: ", error);
      showToast("Failed to submit score.");
      isSubmitting = false;
    });
}

function gotoLeaderboard() {
  window.location.href = "/leaderboard";
}