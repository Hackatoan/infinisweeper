//making the board.
let board = {};
let offsetX = 0;
let offsetY = 0;
const cellSize = 30;
const mineDensity = 0.2;

//position elements
let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };

//game state
let score = 0;
let gameOver = false;

//how many time game attempts to save
const debouncedSaveGameState = debounce(saveGameState, 300);

//enable key events
document.addEventListener("keydown", handleKeyEvents);

//

//board creation
//creates the board
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
      cell.addEventListener("click", () => {
        if (board[`${row},${col}`].adjacentMines === 0) {
          revealAdjacentZeros(row, col);
        } else {
          revealCell(row, col);
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
//creates the starting board
function initializeBoard() {
  board = {};
  score = 0;
  gameOver = false;
  offsetX = 0;
  offsetY = 0;
  startingPosition = null;
  lastRevealedPosition = { row: 0, col: 0 };
  document.getElementById("score-overlay").textContent = `Score: ${score}`;
  document.getElementById("toast").style.display = "none";

  const { rows, cols } = getViewportSize();
  for (let i = -rows; i <= rows; i++) {
    for (let j = -cols; j <= cols; j++) {
      if (!board[`${i},${j}`]) {
        board[`${i},${j}`] = createCell(i, j);
      }
    }
  }

  updateBoardView();
  revealInitialZeros();
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
      if (directClick) {
        // If the cell was directly clicked, update leaderboard
        //submitScore();
      }
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
  const queue = [];
  queue.push({ row, col });
  const visited = new Set();

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    if (!visited.has(`${row},${col}`)) {
      visited.add(`${row},${col}`);
      revealCell(row, col, false); // Pass false to indicate it's not a direct click

      for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
          if (i === row && j === col) continue;
          if (isInBounds(i, j) && calculateAdjacentMines(i, j) === 0) {
            queue.push({ row: i, col: j });
          } else if (
            isInBounds(i, j) &&
            !board[`${i},${j}`].isMine &&
            !board[`${i},${j}`].isRevealed
          ) {
            // Only reveal non-mine cells that are not already revealed
            revealCell(i, j, false);
          }
        }
      }
    }
  }
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
  offsetX = position.col - Math.floor(cols / 2);
  offsetY = position.row - Math.floor(rows / 2);
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
function submitScore() {
  const username = document.getElementById("username").value.trim();
  if (username === "") {
    alert("Please enter a username");
    return;
  }
  /* 
    
    implement database code here.

    */
  alert("submitted");
}

//leaderboard button
function gotoleaderboard() {
  window.location.href = "leaderboard.html";
}

//end of leaderboard logic

//game over events
//shows the game over prompt
function showToast(message) {
  const toast = document.getElementById("toast");
  if (gameOver && message.includes("Game Over!")) {
    // Show the submit score popup before showing the actual toast
    document.getElementById("submit-score").style.display = "block";
    document
      .getElementById("submit-score-button")
      .addEventListener("click", () => {
        submitScore();
      });
  } else {
    toast.textContent = message;
    toast.style.display = "block";
  }
}
//hide the toast
function hideToast() {
  const toast = document.getElementById("submit-score");
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

//determines if window sizes changes and updates view
window.addEventListener("resize", updateBoardView);

//when the page is loaded is loads saved game, then updates view.
document.addEventListener("DOMContentLoaded", () => {
  const gameLoaded = loadGameState();
  if (!gameLoaded) {
    initializeBoard();
  }
});
