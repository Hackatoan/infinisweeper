//making the board.
let board = {};
let offsetX = 0;
let offsetY = 0;
let cellSize = calculateCellSize();
const mineDensity = 0.2;

//position elements
let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };

//game state
let score = 0;
let gameOver = false;

//how many time game attempts to save

//enable key events
document.addEventListener("keydown", handleKeyEvents);

//

//board creation
//creates the board
//creates the board
// Create the board
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

//calc cell size
function calculateCellSize() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxCols = 20; // Adjust the number of columns
  const maxRows = 20; // Adjust the number of rows

  const cellSizeWidth = viewportWidth / maxCols;
  const cellSizeHeight = viewportHeight / maxRows;

  // Use the smaller of the two to ensure the entire board fits
  return Math.floor(Math.min(cellSizeWidth, cellSizeHeight));
}

//initializes the board
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

  // Set offsetX and offsetY to position the middle cell of the viewport
  offsetX = Math.floor(-cols / 2);
  offsetY = Math.floor(-rows / 2);

  // Calculate the coordinates of the middle cell
  const middleCellRow = Math.floor(rows / 2) + offsetY;
  const middleCellCol = Math.floor(cols / 2) + offsetX;

  // Set startingPosition to the coordinates of the middle cell
  startingPosition = { row: middleCellRow, col: middleCellCol };

  // Generate the initial board with the calculated offsetX and offsetY
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

//handles creation of each cell, mine placment and default rules.
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

//exposes zeros immediately in view so player doesnt have to guess initally.
function revealInitialZeros() {
  const { rows, cols } = getViewportSize();
  for (let i = offsetY; i < offsetY + rows; i++) {
    for (let j = offsetX; j < offsetX + cols; j++) {
      if (
        board[`${i},${j}`] &&
        !board[`${i},${j}`].isMine &&
        calculateAdjacentMines(i, j) === 0
      ) {
        revealAdjacentZeros(i, j);
      }
    }
  }
}
//end board creation

//in game events
//reveal cell by direct click
function revealCell(row, col, directClick = true) {
  if (gameOver || !board[`${row},${col}`]) return;
  if (board[`${row},${col}`].isRevealed || board[`${row},${col}`].isFlagged)
    return;

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

      if (adjacentMines === 0) {
        revealAdjacentZeros(row, col);
      }
    }

    if (!startingPosition) {
      startingPosition = { row, col };
    }
    lastRevealedPosition = { row, col };
    if (directClick) {
      incrementScore();
    }
  }
}

//end of game events

//movement
//key events
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

//moves view to center of board
function moveToCenter(position) {
  const { rows, cols } = getViewportSize();

  // Check if a starting position has been set
  if (startingPosition) {
    offsetX = position.col - Math.floor(cols / 2);
    offsetY = position.row - Math.floor(rows / 2);
  }

  updateBoardView();
}

//end of movment

//save progress logic
//saves game locally.
//loads local save game
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
    return true; // Return true to indicate that the game state was loaded
  }
  return false; // Return false if no game state was loaded
}

//end of save logic

//scoreboard logic
//sumbits score to leaderboard
// Replace this function in your JavaScript code

//helper functions
//determines viewing dimensions
function getViewportSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  return { rows, cols };
}

//determines if a cell is in the current view.
function isInBounds(row, col) {
  return board.hasOwnProperty(`${row},${col}`);
}

//determines how many mines are around a cell
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

//refreshes the board when the view port is moved.
function updateBoardView() {
  createBoard();
}

//end of helper functions

//smooth scrolling

//notifications

//determines if window sizes changes and updates view
window.addEventListener("resize", () => {
  cellSize = calculateCellSize();
  updateBoardView();
});

//when the page is loaded is loads saved game, then updates view.
document.addEventListener("DOMContentLoaded", () => {
  const gameLoaded = loadGameState();
  if (!gameLoaded) {
    initializeBoard();
  }
});

// Navigation function to go to leaderboard page
function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html"; // Change this URL to your leaderboard page
}
