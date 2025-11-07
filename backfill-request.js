const itemIds = ["6861012", "6861011", "66130143", "66130133", "66102006", "66102106", "66110225", "66112553", "66112551", "66112554", "66112552", "66112714", "66112712", "66112713", "66112711", "66111131", "66111132", "67400003", "67400103", "67400203", "67410303", "67410403", "67410503", "65203905", "65200505", "65203305", "65201005", "65203505", "65202805", "65203005", "65203705", "65203405", "65204105", "65200605", "65201505"];

fetch('https://lostarkweeklygold.kr/api/market/price-history/backfill', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ itemIds }),
})
  .then(response => response.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(error => console.error('Error:', error));
