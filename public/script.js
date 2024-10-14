let board = {};
let offsetX = 0;
let offsetY = 0;
let cellSize = calculateCellSize();
const mineDensity = 0.2;

let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };

let score = 0;
let gameOver = false;

const debouncedSaveGameState = debounce(saveGameState, 600);

document.addEventListener("keydown", handleKeyEvents);

function createBoard() {
  const extraLayers = 2; // Number of extra layers around the visible board
  const { rows, cols } = getViewportSize();
  const extendedRows = rows + 2 * extraLayers;
  const extendedCols = cols + 2 * extraLayers;
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = `repeat(${extendedCols}, ${cellSize}px)`;
  boardContainer.style.gridTemplateRows = `repeat(${extendedRows}, ${cellSize}px)`;

  for (let i = 0; i < extendedRows; i++) {
    for (let j = 0; j < extendedCols; j++) {
      const cell = document.createElement("div");
      const row = offsetY + i - extraLayers;
      const col = offsetX + j - extraLayers;

      cell.classList.add("cell");
      cell.id = `cell_${row}_${col}`;
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.addEventListener("click", () => {
        // Handle cell click event
      });

      boardContainer.appendChild(cell);
    }
  }
}

function calculateCellSize() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxCols = 10;
  const maxRows = 10;

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

  revealInitialZeros();
  updateBoardView();
  saveGameState();
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

          if (
            (di !== 0 || dj !== 0) &&
            isInBounds(newRow, newCol) &&
            !visited.has(newKey)
          ) {
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
    cell.innerHTML = board[`${row},${col}`].isFlagged ? "&#9873;" : "";
  }
  debouncedSaveGameState();
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
    smoothScrollTo(targetX, targetY, 5000);
    updateBoardView();
    revealInitialZeros();
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
function getSaveGameState() {
  if (localStorage.getItem("minesweeperGameState")) {
    return localStorage.getItem("minesweeperGameState");
  } else {
    console.log("error");
  }
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
    if (gameOver) {
      showToast("Game Over! You hit a mine.");
    }
    return true;
  }
  return false;
}

function getScore() {
  return score;
}
function getUsername() {
  return document.getElementById("username").value.trim();
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (gameOver && message.includes("Game Over!")) {
    document.getElementById("submit-score").style.display = "block";
    document.getElementById("toast").style.display = "block";

    document
      .getElementById("submit-score-button")
      .addEventListener("click", submitScore);
  } else {
    toast.textContent = message;
    toast.style.display = "block";
  }
}

function hideToast() {
  const toast = document.getElementById("submit-score");
  document.getElementById("toast").style.display = "none";

  toast.style.display = "none";
}

function restartGame() {
  hideToast();
  localStorage.removeItem("minesweeperGameState");
  initializeBoard();
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

function incrementScore() {
  if (gameOver) return;

  score++;
  const scoreOverlay = document.getElementById("score-overlay");
  scoreOverlay.textContent = `Score: ${score}`;
  debouncedSaveGameState();
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function smoothScrollTo(targetX, targetY, duration) {
  const startX = window.scrollX || window.pageXOffset;
  const startY = window.scrollY || window.pageYOffset;
  const distanceX = targetX - startX;
  const distanceY = targetY - startY;
  const startTime = performance.now();

  function scrollAnimation(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easeProgress = easeInOut(progress);
    const scrollX = startX + distanceX * easeProgress;
    const scrollY = startY + distanceY * easeProgress;
    window.scrollTo(scrollX, scrollY);

    if (elapsedTime < duration) {
      requestAnimationFrame(scrollAnimation);
    }
  }

  requestAnimationFrame(scrollAnimation);
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
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

firebase
  .auth()
  .signInAnonymously()
  .catch(function (error) {
    console.error("Error during anonymous authentication:", error);
  });

function getScore() {
  return score;
}

function getUsername() {
  return document.getElementById("username").value.trim();
}

function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html";
}

let isSubmitting = false;

function submitScore() {
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
      submitButton.disabled = false;
      isSubmitting = false;
    });
}

function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html";
}
