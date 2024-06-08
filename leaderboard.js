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

// DOM Elements
const leaderboardByScore = document.getElementById("leaderboard-by-score");
const leaderboardByRecent = document.getElementById("leaderboard-by-recent");

// Function to render leaderboard with view button
function renderLeaderboard(doc, leaderboardElement) {
  let li = document.createElement("li");
  let data = doc.data();
  let date = data.date
    ? data.date.toDate().toLocaleString()
    : "No date available";
  li.textContent = `${data.name}: ${data.score} (on ${date})`;

  // Create a button to view the save state
  let viewBtn = document.createElement("button");
  viewBtn.textContent = "VIEW";
  viewBtn.addEventListener("click", () => {
    handleViewSaveState(data.Gamestate); // Call a function to handle viewing save state
  });

  // Append the view button to the list item
  li.appendChild(viewBtn);

  // Append the list item to the specified leaderboard
  leaderboardElement.appendChild(li);
}

// Real-time listener for leaderboard updates by score
// Real-time listener for leaderboard updates by score

// Function to handle viewing save state
function handleViewSaveState(saveState) {
  // Add your code here to handle viewing the save state
  localStorage.setItem("minesweeperViewState", saveState);
  gotoview();
}

function gotoview() {
  console.log("Navigating to leaderboard...");
  window.location.href = "viewboard.html"; // Change this URL to your leaderboard page
}

function gotohome() {
  console.log("Navigating to leaderboard...");
  window.location.href = "index.html"; // Change this URL to your leaderboard page
}
//
//
//
//
// Constants
const entriesPerLoad = 10; // Number of entries to load per batch
let lastVisibleScore = null; // Track the last visible document for score leaderboard
let lastVisibleRecent = null; // Track the last visible document for recent leaderboard
let loadingMoreScore = false; // Flag to prevent multiple simultaneous loadings for score leaderboard
let loadingMoreRecent = false; // Flag to prevent multiple simultaneous loadings for recent leaderboard
let hasMoreEntriesScore = true; // Flag to indicate if there are more entries for score leaderboard
let hasMoreEntriesRecent = true; // Flag to indicate if there are more entries for recent leaderboard

// Function to load more entries on scroll for score leaderboard
function loadMoreEntriesScore() {
  if (!loadingMoreScore && hasMoreEntriesScore && lastVisibleScore) {
    loadingMoreScore = true;
    db.collection("leaderboard")
      .orderBy("score", "desc")
      .startAfter(lastVisibleScore)
      .limit(entriesPerLoad)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.size > 0) {
          lastVisibleScore = querySnapshot.docs[querySnapshot.size - 1];
        } else {
          hasMoreEntriesScore = false;
        }
        querySnapshot.forEach((doc) => {
          renderLeaderboard(doc, leaderboardByScore);
        });
        loadingMoreScore = false;
      })
      .catch((error) => {
        console.error(
          "Error loading more entries for score leaderboard:",
          error
        );
        loadingMoreScore = false;
      });
  }
}

// Function to load more entries on scroll for recent leaderboard
function loadMoreEntriesRecent() {
  if (!loadingMoreRecent && hasMoreEntriesRecent && lastVisibleRecent) {
    loadingMoreRecent = true;
    db.collection("leaderboard")
      .orderBy("date", "desc")
      .startAfter(lastVisibleRecent)
      .limit(entriesPerLoad)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.size > 0) {
          lastVisibleRecent = querySnapshot.docs[querySnapshot.size - 1];
        } else {
          hasMoreEntriesRecent = false;
        }
        querySnapshot.forEach((doc) => {
          renderLeaderboard(doc, leaderboardByRecent);
        });
        loadingMoreRecent = false;
      })
      .catch((error) => {
        console.error(
          "Error loading more entries for recent leaderboard:",
          error
        );
        loadingMoreRecent = false;
      });
  }
}

// Add scroll event listeners to both leaderboards
leaderboardByScore.addEventListener("scroll", () => {
  const isNearBottom =
    leaderboardByScore.offsetHeight + leaderboardByScore.scrollTop >=
    leaderboardByScore.scrollHeight;
  if (isNearBottom && hasMoreEntriesScore) {
    loadMoreEntriesScore();
  }
});

leaderboardByRecent.addEventListener("scroll", () => {
  const isNearBottom =
    leaderboardByRecent.offsetHeight + leaderboardByRecent.scrollTop >=
    leaderboardByRecent.scrollHeight;
  if (isNearBottom && hasMoreEntriesRecent) {
    loadMoreEntriesRecent();
  }
});

// Initial query to load first entries for both leaderboards
function initialLoadLeaderboard() {
  db.collection("leaderboard")
    .orderBy("score", "desc")
    .limit(entriesPerLoad)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.size > 0) {
        lastVisibleScore = querySnapshot.docs[querySnapshot.size - 1];
      } else {
        hasMoreEntriesScore = false;
      }
      querySnapshot.forEach((doc) => {
        renderLeaderboard(doc, leaderboardByScore);
      });
    })
    .catch((error) => {
      console.error(
        "Error loading initial entries for score leaderboard:",
        error
      );
    });

  db.collection("leaderboard")
    .orderBy("date", "desc")
    .limit(entriesPerLoad)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.size > 0) {
        lastVisibleRecent = querySnapshot.docs[querySnapshot.size - 1];
      } else {
        hasMoreEntriesRecent = false;
      }
      querySnapshot.forEach((doc) => {
        renderLeaderboard(doc, leaderboardByRecent);
      });
    })
    .catch((error) => {
      console.error(
        "Error loading initial entries for recent leaderboard:",
        error
      );
    });
}

// Initial loading for both leaderboards
initialLoadLeaderboard();
