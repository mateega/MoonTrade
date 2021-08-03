
// --- INVESTMENT GAIN DOES NOT STAY IF USER SELLS POSITION


// --------- NUMBER FORMATTING AND CURRENT DATE -----------------------------------------------------------------------
const usCurrencyFormat = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}); // usCurrencyFormat.format(num)
const percentFormat = new Intl.NumberFormat("en-US",{style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2});

var today = new Date();
var day = today.getDate();
var month = today.getMonth();
var year = today.getFullYear();
const dateToday = (month + "/" + day + "/" + year);

// --------- SET UP LIVE PRICE DATA -------------------------------------------------------------------
// let wsEth = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@trade'); //price data for eth
// let wsBtc = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade'); //price data for btc
// let wsBnb = new WebSocket('wss://stream.binance.com:9443/ws/bnbusdt@trade'); //price data for bnb

// let ethPriceElement = document.getElementById('eth');
// let btcPriceElement = document.getElementById('btc');
// let bnbPriceElement = document.getElementById('bnb');

// let ethPrice; //current eth price (to be viewed throughout code)

// wsEth.onmessage = (event) => {
//   let stockObject = JSON.parse(event.data);
//   let price = stockObject.p;
//   ethPrice = price;
//   ethPriceElement.innerText = price; //set onscreen eth price to the eth price from binance
// }

// wsBtc.onmessage = (event) => {
//   let stockObject = JSON.parse(event.data);
//   let price = stockObject.p;
//   btcPriceElement.innerText = price; //set onscreen btc price to the btc price from binance
// }

// wsBnb.onmessage = (event) => {
//   let stockObject = JSON.parse(event.data);
//   let price = stockObject.p;
//   bnbPriceElement.innerText = price;
// }

// ----- GET PRICE OF A CRYPTO -------------------------------------------
let wantedPrice = 0.0;
function getPrice(wantedTicker){
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`; // 
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();

    ourRequest.open('GET',url,false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function(){
        console.log(ourRequest.responseText);
        console.log(ourRequest);
        let stockObject = JSON.parse(ourRequest.responseText);
        price = parseFloat(stockObject.lastPrice);
        wantedPrice = price;
    }
    ourRequest.send();
    return wantedPrice;
}
let percentChange = 0.0;
function getPercentChange(wantedTicker){
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`; // 
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();

    ourRequest.open('GET',url,false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function(){
        console.log(ourRequest.responseText);
        console.log(ourRequest);
        let stockObject = JSON.parse(ourRequest.responseText);
        percentChange = parseFloat(stockObject.priceChangePercent);
    }
    ourRequest.send();
    return percentChange;
}

// --------- SELL POSITIONS -------------------------------------------------------------------
const sellPosition = (desiredPositionItem) => {
    const messagesRef = firebase.database().ref();
    messagesRef.on('value', (snapshot) => {
        data = snapshot.val();
        console.log(data);
    });
    for(const positionItem in data) {
        const position = data[positionItem];
        if (positionItem == desiredPositionItem){
            const amountSell = prompt("How many coins would you like to sell?");
            if (amountSell > 0 && amountSell < position.amount){ //to filter out canceled out sell orders
                console.log("user wants to sell part");
                const oldAmount = parseFloat(position.amount);
                const positionEdit = {
                    amount: (oldAmount - amountSell),
                }
                firebase.database().ref(positionItem).update(positionEdit);
                console.log("you are creating a new orderhistory point.");
                //create a new datapoint in firebase
                firebase.database().ref().push({
                    coin: position.coin,
                    price: position.price,
                    sellPrice: getPrice(position.coin),
                    amount: amountSell,
                    buyAmount: position.buyAmount,
                    status: "out",
                    direction: "sell",
                    date: dateToday
                })
                updateInvested(); //update the amount invested number shown on screen
            }
            else if (amountSell == position.amount) {
                console.log("user wants to sell all");
                // firebase.database().ref(positionItem).remove();
                const positionEdit = { //update old position
                    status: "out"
                }
                firebase.database().ref(positionItem).update(positionEdit);
                firebase.database().ref().push({
                    coin: position.coin,
                    price: position.price,
                    sellPrice: getPrice(position.coin),
                    amount: amountSell,
                    buyAmount: position.buyAmount,
                    status: "out",
                    direction: "sell",
                    date: dateToday
                })
                updateInvested();
            }
            else {
                console.log("user has cancelled sell order");
            }
        }

  };

}

// --------- CURRENT POSITIONS -------------------------------------------------------------------
window.onload = (event) => {
    setTimeout(() => {
        getPositions(); //delay so porfolio can be valued at current crypto prices (takes a second to get this data)
        getSortedPositions();
    }, 2000); 
};

let data = ``;
const getPositions = () => {
    var dbRef = firebase.database().ref();
    dbRef.orderByChild("coin").on('value', (snapshot) => { 
        
        data = snapshot.val();
        console.log("messed?");
        console.log(data);
        renderDataAsHtml(data);
    });
}

const getSortedPositions = () => {
    var dbRef = firebase.database().ref();
    dbRef.orderByChild("coin").on("child_added", snap => {
        console.log("SORTED?");
        console.log(snap.val());
    });
}

let cards = ``;
let orderHistory = ``;
let positions = [];
let porfolioValue = 0; // this is actually amount invested
let porfolioWorth = 0;
let tickers = ["exampleTicker"];
const renderDataAsHtml = (data) => {
    cards = ``;
    orderHistory = ``;
    for(const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        console.log(ticker);
        if (position.status == "in"){
            cards += createCard(position, positionItem) // For each position create an HTML card
            tickers.push(ticker);
            positions.push(position);
            let positionValue = (position.amount)*(position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount)*(getPrice(position.coin)));
        }
        if (position.status == "out" && position.direction == "sell") { //if "out"
            porfolioWorth += ((position.amount)*(position.sellPrice) - (position.amount)*(position.price));//add in buy price
        }
        orderHistory += createOrder(position, positionItem) // For each position create an HTML card
        
  };
  document.querySelector('#app').innerHTML = cards;
  document.querySelector('#appHistory').innerHTML = orderHistory;
  getBalance();
};

const createCard = (position, positionItem) => {
    let innerHTML = "";
    innerHTML += `<div class="card">`
    innerHTML += `<header class="card-header">`
    innerHTML += `<p class="card-header-title ">`
    innerHTML += `${position.coin} (${position.amount})`
    innerHTML += `</p>`
    innerHTML += `<p class="card-header-title ">`
    let gain = (((position.amount)*(getPrice(position.coin))) - (position.amount)*((position.price)));
    let gainSymbol = "";
    if (gain >= 0){
        gainSymbol = "+";
    }
    //innerHTML += `${usCurrencyFormat.format((position.amount)*(getPrice(position.coin)))} (${gainSymbol + usCurrencyFormat.format(gain)})`
    innerHTML += `${usCurrencyFormat.format(getPrice(position.coin))} (${percentFormat.format((getPercentChange(position.coin))/100)})`
    innerHTML += `</p>`
    innerHTML += `<button class="card-header-icon" aria-label="more options" id="${positionItem}" onclick="sellPosition(this.id)">`
    innerHTML += `Sell`
    innerHTML += `</button>`
    innerHTML += `</header>`
    innerHTML += `</div>`
  
//   innerHTML += `<div class="column is-one-quarter">`
//   innerHTML += `<div class="card">`
//   innerHTML += `<header class="card-header">`
//   innerHTML += `<p class="card-header-title">`
//   innerHTML += `${position.coin} (${position.amount})`
//   innerHTML += `</p>`
//   innerHTML += `<p class="card-header-title">`
//   let gain = (((position.amount)*(getPrice(position.coin))) - (position.amount)*((position.price)));
//   let gainSymbol = "";
//   if (gain >= 0){
//     gainSymbol = "+";
//   }
//   innerHTML += `${usCurrencyFormat.format((position.amount)*(getPrice(position.coin)))} (${gainSymbol + usCurrencyFormat.format(gain)})`
//   innerHTML += `</p>`
//   innerHTML += `</header>`
//   innerHTML += `</div>`
//   innerHTML += `</div>`
    return innerHTML;
};

const createOrder = (position, positionItem) => {
    let innerHTML = "";
    
    // innerHTML += `<div class="card">`
    // innerHTML += `<header class="card-header" >`
    // innerHTML += `<p class="card-header-title" >`
    // innerHTML += `${position.date}`
    // innerHTML += `</p>`
    // innerHTML += `<p class="card-header-title" >`
    // innerHTML += `${position.coin}`
    // innerHTML += `</p>`
    // innerHTML += `<p class="card-header-title" >`
    // innerHTML += `${position.direction}`
    // innerHTML += `</p>`
    // innerHTML += `<p class="card-header-title" >`
    // let shownAmount = position.amount
    // if (position.status == "in"){shownAmount = position.buyAmount;}
    // innerHTML += `${shownAmount}`
    // innerHTML += `</p>`
    // innerHTML += `<p class="card-header-title" >`
    // innerHTML += `${usCurrencyFormat.format(position.price)}`
    // innerHTML += `</p>`
    // innerHTML += `<p class="card-header-title" >`
    // innerHTML += `${usCurrencyFormat.format(shownAmount*(position.price))}`
    // innerHTML += `</p>`
    // innerHTML += `</header>`
    // innerHTML += `</div>`    

    innerHTML += `<div class="card">`
    innerHTML += `<div class="columns" >`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4"><b>${position.date}</b></p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${position.coin}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${position.direction}</p></div>`
    let shownAmount = position.amount
    if (position.status == "in"){shownAmount = position.buyAmount;}
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${shownAmount}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${usCurrencyFormat.format(position.price)}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4"><b>${usCurrencyFormat.format(shownAmount*(position.price))}</b></p></div>`
    innerHTML += `</div>`
    innerHTML += `</div>`

    return innerHTML;
}

// --------- PORTFOLIO BALANCE -------------------------------------------------------------------
let valueElement = document.getElementById('value');
let gainElement = document.getElementById('gain');
let investElement = document.getElementById('invested');
let cashElement = document.getElementById('cash');
let invested;
let cash;

const getBalance = () => {
    invested = porfolioValue;
    cash = 100000 - invested;
    investElement.innerText = usCurrencyFormat.format(invested);
    cashElement.innerText = usCurrencyFormat.format(cash);
    createPieChart(invested, cash);
    // console.log(porfolioValue);
    // console.log(`cash: ${cash}`);
    console.log("Portfolio worth");
    console.log(porfolioWorth + cash);
    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0){
        gainSymbol = "+";
    }
    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain/100000)}) Total`);
}

const updateInvested = () => {
    porfolioValue = 0;
    porfolioWorth = 0;
    const messagesRef = firebase.database().ref();
    messagesRef.on('value', (snapshot) => {
        data = snapshot.val();
        console.log(data);
    });

    for(const positionItem in data) {
        const position = data[positionItem];
        if (position.status == "in"){
            let positionValue = (position.amount)*(position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount)*(getPrice(position.coin)));
        }
        if (position.status == "out" && position.direction == "sell") { //if "out"
            porfolioWorth += ((position.amount)*(position.sellPrice) - (position.amount)*(position.price));
        }
    };
    console.log("NEW PORTFOLIO VALUE");
    console.log(porfolioValue);
    cash = 100000 - porfolioValue;
    investElement.innerText = usCurrencyFormat.format(porfolioValue);
    cashElement.innerText = usCurrencyFormat.format(cash);
    createPieChart(porfolioValue, cash);
    
    console.log("Portfolio worth");
    console.log(porfolioWorth + cash);

    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0){
        gainSymbol = "+";
    }

    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain/100000)}) Total`);
    
}

// ------ Pi Chart ---------------------
const createPieChart = (invested, cash) => {
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);
    // Draw the chart and set the chart values
    function drawChart() {
        var data = google.visualization.arrayToDataTable([
            ['Distripution', 'Percent'],
            ['Invested', invested],
            ['Cash', cash]
        ]);
        var options = {'legend': 'none', 'width': 140, 'height': 160,
        'chartArea': {'width': '100%', 'height': '80%'}}; 
        // Display the chart inside the <div> element with id="piechart"
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        chart.draw(data, options);
    }
}


// -------- USE FOR SEARCH PAGE --------------------------------------------------------------
// -------- BUY POSITIONS --------------------------------------------------------------------
const buyEth = () => {
    const buyAmount = document.querySelector('#buyAmount').value;
    const lotSize = parseFloat(buyAmount);
    
    console.log({
    price: ethPrice,
    amount: lotSize
    }); 

    if (tickers.includes("ETH")){ //see if there is a current position in ETH
        console.log("you already have a position in this crypto.");
        //update the current position
        updateCurrentPosition(ethPrice, lotSize);
    }
    else {
        console.log("you are entering a new position.");
        //create a new position in firebase
        firebase.database().ref().push({
            coin: "ETH",
            price: ethPrice,
            amount: lotSize,
            buyAmount: lotSize,
            status: "in",
            direction: "buy",
            date: dateToday
        })
    }
    updateInvested(); //update the amount invested number shown on screen
}



const updateCurrentPosition = (newPrice, newAmount) => {
    for(const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        console.log(ticker);
        if (ticker == "ETH"){
            console.log("match");
            const oldAmount = parseFloat(position.amount);
            const oldPrice = parseFloat(position.price)
            const positionEdit = {
                coin: "ETH",
                price: ((((oldPrice)*(oldAmount)) + (newPrice*newAmount))/(oldAmount + newAmount)),
                amount: oldAmount + newAmount,
                //date: dateToday
            }
            firebase.database().ref(positionItem).update(positionEdit);
        }
    }
}



