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

const leaderboardByScore = document.getElementById("leaderboard-by-score");
const leaderboardByRecent = document.getElementById("leaderboard-by-recent");

function renderLeaderboard(doc, leaderboardElement) {
  let li = document.createElement("li");
  let data = doc.data();
  let date = data.date
    ? data.date.toDate().toLocaleString()
    : "No date available";
  li.textContent = `${data.name}: ${data.score} (on ${date})`;

  let viewBtn = document.createElement("button");
  viewBtn.textContent = "VIEW";
  viewBtn.addEventListener("click", () => {
    handleViewSaveState(data.gamestate);
  });

  li.appendChild(viewBtn);

  leaderboardElement.appendChild(li);
}

function handleViewSaveState(saveState) {
  localStorage.setItem("minesweeperViewState", saveState);
  gotoview();
}

function gotoview() {
  console.log("Navigating to leaderboard...");
  window.location.href = "viewboard.html";
}

function gotohome() {
  console.log("Navigating to leaderboard...");
  window.location.href = "index.html";
}

const entriesPerLoad = 10;
let lastVisibleScore = null;
let lastVisibleRecent = null;
let loadingMoreScore = false;
let loadingMoreRecent = false;
let hasMoreEntriesScore = true;
let hasMoreEntriesRecent = true;

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

initialLoadLeaderboard();
