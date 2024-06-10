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
const debouncedSaveGameState = debounce(saveGameState, 600);

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
          updateBoardView();
        } else {
          revealCell(row, col);
          updateBoardView();
        }
      });
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleFlag(row, col);
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

  const maxCols = 10; // Adjust the number of columns
  const maxRows = 10; // Adjust the number of rows

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

  revealInitialZeros();
  updateBoardView();
  saveGameState();
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
    saveGameState();
  }
}

//exposes all adjacent zeros.
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

  // Batch update the DOM
  cellsToUpdate.forEach(({ row, col }) => {
    const cell = document.getElementById(`cell_${row}_${col}`);
    if (cell) {
      cell.classList.add("revealed");
      const adjacentMines = board[`${row},${col}`].adjacentMines;
      cell.textContent = adjacentMines > 0 ? adjacentMines : "";
    }
  });
}

//allows user to mark a cell as having a flag
function toggleFlag(row, col) {
  if (gameOver || !board[`${row},${col}`]) return;
  const cell = document.getElementById(`cell_${row}_${col}`);
  if (cell && !board[`${row},${col}`].isRevealed) {
    board[`${row},${col}`].isFlagged = !board[`${row},${col}`].isFlagged;
    cell.innerHTML = board[`${row},${col}`].isFlagged ? "&#9873;" : "";
  }
  debouncedSaveGameState();
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
    smoothScrollTo(targetX, targetY, 5000); // Adjust duration as needed
    updateBoardView();
    revealInitialZeros();
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
//loads local save game
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
    return true; // Return true to indicate that the game state was loaded
  }
  return false; // Return false if no game state was loaded
}

//end of save logic

//scoreboard logic
//sumbits score to leaderboard
// Replace this function in your JavaScript code

//leaderboard button
function getScore() {
  return score;
}
function getUsername() {
  return document.getElementById("username").value.trim();
}
//end of leaderboard logic

//game over events
//shows the game over prompt
function showToast(message) {
  const toast = document.getElementById("toast");

  // Function to handle submission after clicking the submit button

  if (gameOver && message.includes("Game Over!")) {
    // Show the submit score popup before showing the actual toast
    document.getElementById("submit-score").style.display = "block";
    document.getElementById("toast").style.display = "block";

    // Add the event listener to the submit button (corrected)
    document
      .getElementById("submit-score-button")
      .addEventListener("click", submitScore);
  } else {
    toast.textContent = message;
    toast.style.display = "block";
  }
}

//hide the toast
function hideToast() {
  const toast = document.getElementById("submit-score");
  document.getElementById("toast").style.display = "none";

  toast.style.display = "none";
}

//restarts game
function restartGame() {
  hideToast();
  localStorage.removeItem("minesweeperGameState");
  initializeBoard();
}

//end of endgame events

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

//increases score.
function incrementScore() {
  if (gameOver) return;

  score++;
  const scoreOverlay = document.getElementById("score-overlay");
  scoreOverlay.textContent = `Score: ${score}`;
  debouncedSaveGameState();
}

//creates delay to improve performance (when saving)
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

//end of helper functions

//smooth scrolling

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

//notifications
function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000); // Hide after 3 seconds
}

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

// script.js

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxljmVtRsgUzDxmBUpG2DqKMO_y5ZwPdQ",
  authDomain: "infinisweeper.firebaseapp.com",
  projectId: "infinisweeper",
  storageBucket: "infinisweeper.appspot.com",
  messagingSenderId: "1032351039520",
  appId: "1:1032351039520:web:a82823c12bca7a84ba7c45",
  measurementId: "G-ZW6HN7WDTP",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Function to get the current score
function getScore() {
  return score;
}

// Function to get the current username from the input field
function getUsername() {
  return document.getElementById("username").value.trim();
}

// Exporting the functions for use in other scripts

function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html"; // Change this URL to your leaderboard page
}

// Flag variable to track if submission is in progress
let isSubmitting = false;

// Function to submit score
function submitScore() {
  const now = new Date();
  db.collection("leaderboard")
    .add({
      name: getUsername(),
      score: getScore(),
      date: firebase.firestore.Timestamp.fromDate(now),
      gamestate: getSaveGameState(),
    })
    .then(() => {
      // Clear form fields after successful submission
      document.getElementById("username").value = "";
      showToast("Score submitted successfully!");
      isSubmitting = false; // Reset the flag after submission is complete
      gotoLeaderboard(); // Navigate to leaderboard after successful submission
    })
    .catch((error) => {
      aa;
      console.error("Error adding document: ", error);
      showToast("Failed to submit score.");
      submitButton.disabled = false; // Re-enable the button on error
      isSubmitting = false; // Reset the flag after submission is complete (even if there's an error)
    });
}

// Navigation function to go to leaderboard page
function gotoLeaderboard() {
  console.log("Navigating to leaderboard...");
  window.location.href = "leaderboard.html"; // Change this URL to your leaderboard page
}
