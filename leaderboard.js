document.addEventListener('DOMContentLoaded', () => {
    fetch('https://script.google.com/macros/s/AKfycbyxdcUgDpw2rBRHySPGhKUk0L-1RI5r3FMW5W7EdGSZUU2Nlxvk-WHGO77TUd5ACycSow/exec') 
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const leaderboardTable = document.getElementById('leaderboard').getElementsByTagName('tbody')[0];
      data.forEach((entry, index) => {
        const row = leaderboardTable.insertRow();
        const rankCell = row.insertCell(0);
        const usernameCell = row.insertCell(1);
        const scoreCell = row.insertCell(2);
  
        rankCell.textContent = index + 1;
        usernameCell.textContent = entry[0];
        scoreCell.textContent = entry[1];
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });