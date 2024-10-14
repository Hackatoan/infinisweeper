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

// Debounced Functions
const debouncedSaveGameState = debounce(saveGameState, DEBOUNCE_DELAY);

// Event Listeners
document.addEventListener("keydown", handleKeyEvents);
window.addEventListener("resize", onResize);
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDxljmVtRsgUzDxmBUpG2DqKMO_y5ZwPdQ",
  authDomain: "infinisweeper.firebaseapp.com",
  projectId: "infinisweeper",
  storageBucket: "infinisweeper.appspot.com",
  messagingSenderId: "1032351039520",
  appId: "1:1032351039520:web:a82823c12bca7a84ba7c45",
  measurementId: "G-ZW6HN7WDTP",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

firebase.auth().signInAnonymously().catch(console.error);

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
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  boardContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i - EXTRA_CELLS;
      const col = offsetX + j - EXTRA_CELLS;
      const cell = createCellElement(row, col);
      boardContainer.appendChild(cell);
    }
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
  score = 0;
  gameOver = false;
  startingPosition = null;
  lastRevealedPosition = { row: 0, col: 0 };
  document.getElementById("score-overlay").textContent = `Score: ${score}`;
  document.getElementById("toast").style.display = "none";
}

function createCell(row, col) {
  const isMine = Math.random() < MINE_DENSITY;
  const adjacentMines = calculateAdjacentMines(row, col);
  return { isMine, isRevealed: false, isFlagged: false, adjacentMines, isVisited: false };
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
      if (adjacentMines === 0) revealAdjacentZeros(row, col);
    }

    if (!startingPosition) startingPosition = { row, col };
    lastRevealedPosition = { row, col };
    if (directClick) incrementScore();
    saveGameState();
  }
}

function revealAdjacentZeros(row, col) {
  const queue = [{ row, col }];
  const visited = new Set([`${row},${col}`]);
  const cellsToUpdate = [];

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    const key = `${row},${col}`;
    if (board[key].isMine || board[key].isRevealed) continue;

    board[key].isRevealed = true;
    cellsToUpdate.push({ row, col });

    if (board[key].adjacentMines === 0) {
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
      const adjacentMines = board[`${row},${col}`].adjacentMines;
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
  if (gameOver) return;

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

function updateBoardView() {
  const { rows, cols } = getViewportSize();
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  boardContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const row = offsetY + i - EXTRA_CELLS;
      const col = offsetX + j - EXTRA_CELLS;
      const cell = createCellElement(row, col);
      boardContainer.appendChild(cell);
    }
  }
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
  };
  localStorage.setItem("minesweeperGameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem("minesweeperGameState");
  if (savedState) {
    const gameState = JSON.parse(savedState);
    board = gameState.board;
    offsetX = gameState.offsetX;
    offsetY = gameState.offsetY;
    startingPosition = gameState.startingPosition;
    lastRevealedPosition = gameState.lastRevealedPosition;
    score = gameState.score;
    gameOver = gameState.gameOver;

    updateBoardView();
    document.getElementById("score-overlay").textContent = `Score: ${score}`;
    if (gameOver) showToast("Game Over! You hit a mine.");
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

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";

  if (gameOver && message.includes("Game Over!")) {
    document.getElementById("submit-score").style.display = "block";
    document.getElementById("submit-score-button").addEventListener("click", submitScore);
  }
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
      if (board[`${row + di},${col + dj}`] && board[`${row + di},${col + dj}`].isMine) {
        adjacentMines++;
      }
    }
  }
  return adjacentMines;
}

function createCellElement(row, col) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.id = `cell_${row}_${col}`;
  cell.style.width = `${cellSize}px`;
  cell.style.height = `${cellSize}px`;
  cell.addEventListener("click", () => handleCellClick(row, col));
  cell.addEventListener("contextmenu", (e) => handleCellRightClick(e, row, col));

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
  if (board[`${row},${col}`].adjacentMines === 0) {
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
  window.location.href = "leaderboard.html";
}

// Debounce function
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Handle window resize
function onResize() {
  cellSize = calculateCellSize();
  updateBoardView();
}

// Handle DOMContentLoaded event
function onDOMContentLoaded() {
  const gameLoaded = loadGameState();
  if (!gameLoaded) initializeBoard();
}