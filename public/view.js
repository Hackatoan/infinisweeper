let board = {};
let offsetX = 0;
let offsetY = 0;
let cellSize = calculateCellSize();
const mineDensity = 0.2;

let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };

let score = 0;
let gameOver = false;

document.addEventListener("keydown", handleKeyEvents);

function createBoard() {
  const { rows, cols } = getViewportSize();
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  boardContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = document.createElement("div");
      const row = offsetY + i;
      const col = offsetX + j;

      cell.classList.add("cell");
      cell.id = `cell_${row}_${col}`;
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.addEventListener("click", () => {
        if (board[`${row},${col}`].adjacentMines === 0) {
          revealAdjacentZeros(row, col);
        } else {
          revealCell(row, col);
        }
      });

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
          cell.innerHTML = "&#9873;";
        }
      } else {
        board[`${row},${col}`] = createCell(row, col);
      }

      boardContainer.appendChild(cell);
    }
  }
}

function calculateCellSize() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxCols = 20;
  const maxRows = 20;

  const cellSizeWidth = viewportWidth / maxCols;
  const cellSizeHeight = viewportHeight / maxRows;

  return Math.floor(Math.min(cellSizeWidth, cellSizeHeight));
}

function initializeBoard() {
  cellSize = calculateCellSize();
  board = {};
  score = 0;
  gameOver = false;
  startingPosition = null;
  lastRevealedPosition = { row: 0, col: 0 };
  document.getElementById("score-overlay").textContent = `Score: ${score}`;
  document.getElementById("toast").style.display = "none";

  const { rows, cols } = getViewportSize();

  offsetX = Math.floor(-cols / 2);
  offsetY = Math.floor(-rows / 2);

  const middleCellRow = Math.floor(rows / 2) + offsetY;
  const middleCellCol = Math.floor(cols / 2) + offsetX;

  startingPosition = { row: middleCellRow, col: middleCellCol };

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i;
      const col = offsetX + j;
      if (!board[`${row},${col}`]) {
        board[`${row},${col}`] = createCell(row, col);
      }
    }
  }

  updateBoardView();
  revealInitialZeros();
}

function createCell(row, col) {
  const isMine = Math.random() < mineDensity;
  let adjacentMines = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      if (
        board[`${row + di},${col + dj}`] &&
        board[`${row + di},${col + dj}`].isMine
      ) {
        adjacentMines++;
      }
    }
  }
  return {
    isMine: isMine,
    isRevealed: false,
    isFlagged: false,
    adjacentMines: adjacentMines,
    isVisited: false,
  };
}

function handleKeyEvents(event) {
  if (gameOver) return;

  const key = event.key;
  let moved = false;
  let targetX = window.scrollX;
  let targetY = window.scrollY;
  if (key === "ArrowUp") {
    offsetY--;
    moved = true;
  } else if (key === "ArrowDown") {
    offsetY++;
    moved = true;
  } else if (key === "ArrowLeft") {
    offsetX--;
    moved = true;
  } else if (key === "ArrowRight") {
    offsetX++;
    moved = true;
  } else if (key === "w") {
    offsetY--;
    moved = true;
  } else if (key === "s") {
    offsetY++;
    moved = true;
  } else if (key === "a") {
    offsetX--;
    moved = true;
  } else if (key === "d") {
    offsetX++;
    moved = true;
  } else if (key === "c" && startingPosition) {
    moveToCenter(startingPosition);
  } else if (key === "l") {
    moveToCenter(lastRevealedPosition);
  }

  if (moved) {
    updateBoardView();
  }
}

function moveToCenter(position) {
  const { rows, cols } = getViewportSize();

  if (startingPosition) {
    offsetX = position.col - Math.floor(cols / 2);
    offsetY = position.row - Math.floor(rows / 2);
  }

  updateBoardView();
}

function loadGameState() {
  const savedState = localStorage.getItem("minesweeperViewState");
  if (savedState) {
    const gameState = JSON.parse(savedState);
    board = gameState.board;
    offsetX = gameState.offsetX;
    offsetY = gameState.offsetY;
    startingPosition = gameState.startingPosition;
    lastRevealedPosition = gameState.lastRevealedPosition;
    score = gameState.score;
    gameOver = false;

    updateBoardView();
    document.getElementById("score-overlay").textContent = `Score: ${score}`;
    if (gameOver) {
      showToast("Game Over! You hit a mine.");
    }
    return true;
  }
  return false;
}

function getViewportSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
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
      if (
        board[`${row + di},${col + dj}`] &&
        board[`${row + di},${col + dj}`].isMine
      ) {
        adjacentMines++;
      }
    }
  }
  return adjacentMines;
}

function updateBoardView() {
  createBoard();
}

window.addEventListener("resize", () => {
  cellSize = calculateCellSize();
  updateBoardView();
});

document.addEventListener("DOMContentLoaded", () => {
  const gameLoaded = loadGameState();
  if (!gameLoaded) {
    initializeBoard();
  }
});

function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html";
}
