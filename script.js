let board = {};
let offsetX = 0;
let offsetY = 0;
const cellSize = 30;
const mineDensity = 0.2;

let startingPosition = null;
let lastRevealedPosition = { row: 0, col: 0 };
let score = 0;
let gameOver = false;

const debouncedSaveGameState = debounce(saveGameState, 300);

document.addEventListener('keydown', handleKeyEvents);

function initializeBoard() {
    board = {};
    score = 0;
    gameOver = false;
    offsetX = 0;
    offsetY = 0;
    startingPosition = null;
    lastRevealedPosition = { row: 0, col: 0 };
    document.getElementById('score-overlay').textContent = `Score: ${score}`;
    document.getElementById('toast').style.display = 'none';

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

function createCell(row, col) {
    const isMine = Math.random() < mineDensity;
    return {
        isMine: isMine,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0
    };
}

function revealCell(row, col) {
    if (gameOver || !board[`${row},${col}`]) return;
    if (board[`${row},${col}`].isRevealed || board[`${row},${col}`].isFlagged) return;

    const cell = document.getElementById(`cell_${row}_${col}`);
    if (cell) {
        board[`${row},${col}`].isRevealed = true;
        cell.classList.add('revealed');
        
        if (board[`${row},${col}`].isMine) {
            cell.classList.add('mine');
            gameOver = true;
            showToast('Game Over! You hit a mine.');
        } else {
            const adjacentMines = calculateAdjacentMines(row, col);
            cell.innerHTML = adjacentMines > 0 ? adjacentMines : '';

            if (adjacentMines === 0) {
                revealAdjacentZeros(row, col);
            }
        }

        if (!startingPosition) {
            startingPosition = { row, col };
        }
        lastRevealedPosition = { row, col };
        incrementScore();
        saveGameState();
    }
}

function revealAdjacentZeros(row, col) {
    const queue = [];
    queue.push({ row, col });
    const visited = new Set();

    while (queue.length > 0) {
        const { row, col } = queue.shift();
        if (!visited.has(`${row},${col}`)) {
            visited.add(`${row},${col}`);
            revealCell(row, col);

            for (let i = row - 1; i <= row + 1; i++) {
                for (let j = col - 1; j <= col + 1; j++) {
                    if (i === row && j === col) continue;
                    if (isInBounds(i, j) && calculateAdjacentMines(i, j) === 0) {
                        queue.push({ row: i, col: j });
                    } else if (isInBounds(i, j) && !board[`${i},${j}`].isMine && !board[`${i},${j}`].isRevealed) {
                        revealCell(i, j);
                    }
                }
            }
        }
    }
}


function isInBounds(row, col) {
    return board.hasOwnProperty(`${row},${col}`);
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



function toggleFlag(row, col) {
    if (gameOver || !board[`${row},${col}`]) return;
    const cell = document.getElementById(`cell_${row}_${col}`);
    if (cell && !board[`${row},${col}`].isRevealed) {
        board[`${row},${col}`].isFlagged = !board[`${row},${col}`].isFlagged;
        cell.innerHTML = board[`${row},${col}`].isFlagged ? '&#9873;' : '';
    }
    debouncedSaveGameState();
}

function calculateAdjacentMines(row, col) {
    let adjacentMines = 0;
    for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            if (board[`${row+di},${col+dj}`] && board[`${row+di},${col+dj}`].isMine) {
                adjacentMines++;
            }
        }
    }
    return adjacentMines;
}

function createBoard() {
    const { rows, cols } = getViewportSize();
    const boardContainer = document.getElementById('board');
    boardContainer.innerHTML = '';
    boardContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    boardContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            const row = offsetY + i;
            const col = offsetX + j;

            cell.classList.add('cell');
            cell.id = `cell_${row}_${col}`;
            cell.addEventListener('click', () => revealCell(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(row, col);
            });

            if (board[`${row},${col}`]) {
                const cellData = board[`${row},${col}`];
                if (cellData.isRevealed) {
                    cell.classList.add('revealed');
                    if (cellData.isMine) {
                        cell.classList.add('mine');
                    } else {
                        const adjacentMines = calculateAdjacentMines(row, col);
                        cell.innerHTML = adjacentMines > 0 ? adjacentMines : '';
                    }
                } else if (cellData.isFlagged) {
                    cell.innerHTML = '&#9873;';
                }
            } else {
                board[`${row},${col}`] = createCell(row, col);
            }

            boardContainer.appendChild(cell);
        }
    }
}

function handleKeyEvents(event) {
    if (gameOver) return;

    const key = event.key;
    let moved = false;
    if (key === 'ArrowUp') {
        offsetY--;
        moved = true;
    } else if (key === 'ArrowDown') {
        offsetY++;
        moved = true;
    } else if (key === 'ArrowLeft') {
        offsetX--;
        moved = true;
    } else if (key === 'ArrowRight') {
        offsetX++;
        moved = true;
    } else if (key === 's' && startingPosition) {
        moveToCenter(startingPosition);
    } else if (key === 'l') {
        moveToCenter(lastRevealedPosition);
    }
    if (moved) {
        updateBoardView();
    }
}

function moveToCenter(position) {
    const { rows, cols } = getViewportSize();
    offsetX = position.col - Math.floor(cols / 2);
    offsetY = position.row - Math.floor(rows / 2);
    updateBoardView();
}

function updateBoardView() {
    createBoard();
}

function incrementScore() {
    if (gameOver) return;

    score++;
    const scoreOverlay = document.getElementById('score-overlay');
    scoreOverlay.textContent = `Score: ${score}`;
    debouncedSaveGameState();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
}

function restartGame() {
    localStorage.removeItem('minesweeperGameState');
    initializeBoard();
}

function revealSurroundingCells(row, col) {
    for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
            if (i === row && j === col) continue;
            revealCell(i, j);
        }
    }
}

function countSurroundingFlags(row, col) {
    let flagCount = 0;
    for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
            if (i === row && j === col) continue;
            if (board[`${i},${j}`] && board[`${i},${j}`].isFlagged) {
                flagCount++;
            }
        }
    }
    return flagCount;
}

function saveGameState() {
    const gameState = {
        board,
        offsetX,
        offsetY,
        startingPosition,
        lastRevealedPosition,
        score,
        gameOver
    };
    localStorage.setItem('minesweeperGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('minesweeperGameState');
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
        document.getElementById('score-overlay').textContent = `Score: ${score}`;
        if (gameOver) {
            showToast('Game Over! You hit a mine.');
        }
    }
}



function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';

    if (gameOver) {
        document.getElementById('submit-score').style.display = 'block';
    }
}

function submitScore() {
    const username = document.getElementById('username').value.trim();
    if (username === "") {
        alert("Please enter a username");
        return;
    }
  
    fetch('https://script.google.com/macros/s/AKfycbyxdcUgDpw2rBRHySPGhKUk0L-1RI5r3FMW5W7EdGSZUU2Nlxvk-WHGO77TUd5ACycSow/exec', {
    method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: username, score: score })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      window.location.href = 'leaderboard.html';
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }

function restartGame() {
    localStorage.removeItem('gameState');
    document.getElementById('submit-score').style.display = 'none';
    initializeBoard();
}

function gotoleaderboard() {
    window.location.href = 'leaderboard.html';
}

function getViewportSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    return { rows, cols };
}

window.addEventListener('resize', updateBoardView);

document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    updateBoardView();
});

initializeBoard();
