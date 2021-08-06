// --------- NUMBER FORMATTING, LOADING, AND CURRENT DATE -----------------------------------------------------------------------
const usCurrencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }); // usCurrencyFormat.format(num)
const percentFormat = new Intl.NumberFormat("en-US", { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

var today = new Date();
var day = today.getDate();
var month = today.getMonth();
var year = today.getFullYear();
const dateToday = (month + "/" + day + "/" + year);

const modal = document.querySelector('#loadingModal');
const closeModal = () => {
    modal.classList.toggle('is-active');
}
// modal.classList.toggle('is-active');
// setTimeout(() => {   
// }, 0050);

// ----- GET PRICE OF A CRYPTO -------------------------------------------
let wantedPrice = 0.0;

function getPrice(wantedTicker) {
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`;
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();
    ourRequest.open('GET', url, false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function () {
        // console.log(ourRequest.responseText);
        let stockObject = JSON.parse(ourRequest.responseText);
        price = parseFloat(stockObject.lastPrice);
        wantedPrice = price;
    }
    ourRequest.send();
    return wantedPrice;
}

let percentChange = 0.0;
function getPercentChange(wantedTicker) {
    var burl = "https://api.binance.com";
    var query = '/api/v1/ticker/24hr';
    query += `?symbol=${wantedTicker}USDT`; // 
    var url = burl + query;
    var ourRequest = new XMLHttpRequest();

    ourRequest.open('GET', url, false); // false = synchronous which is causing delay. true = asynchronous, but i couldn't figure out how to not return undefined with asynchronous
    ourRequest.onload = function () {
        // console.log(ourRequest.responseText);
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
        //console.log(data);
    });
    for (const positionItem in data) {
        const position = data[positionItem];
        if (positionItem == desiredPositionItem) {
            const amountSell = prompt("How many coins would you like to sell?");
            closeModal();
            setTimeout(() => {
                if (amountSell > 0 && amountSell < position.amount) { //to filter out canceled out sell orders
                    // user wants to sell part
                    const oldAmount = parseFloat(position.amount);
                    const positionEdit = {
                        coin: position.coin,
                        price: position.price,
                        amount: (oldAmount - amountSell),
                    }
                    firebase.database().ref(positionItem).update(positionEdit);
                    //create a new datapoint in firebase
                    firebase.database().ref().push({
                        coin: position.coin,
                        price: getPrice(position.coin),
                        buyAmount: position.buyAmount,
                        amount: amountSell,
                        status: "out",
                        direction: "sell",
                        date: dateToday,
                        watch: false
                    })
                    updateInvested(); //update the amount invested number shown on screen
                    modal.classList.toggle('is-active');
                }
                else if (amountSell == position.amount) {
                    
                    // user wants to sell all
                    // firebase.database().ref(positionItem).remove();
                    const positionEdit = { //update old position
                        status: "out"
                    }
                    firebase.database().ref(positionItem).update(positionEdit);
                    firebase.database().ref().push({
                        coin: position.coin,
                        price: getPrice(position.coin),
                        amount: amountSell,
                        buyAmount: position.buyAmount,
                        status: "out",
                        direction: "sell",
                        date: dateToday,
                        watch: false
                    })
                    updateInvested();
                    modal.classList.toggle('is-active');
                }
                else {
                    modal.classList.toggle('is-active');
                    // user has cancelled sell order
                }
            }, 0050);
        }
    };
}

// --------- CURRENT POSITIONS -------------------------------------------------------------------
window.onload = (event) => {
    console.log('hit');
    displayWatch();
    modal.classList.toggle('is-active');
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
        console.log(snapshot);
        //console.log(data);
        renderDataAsHtml(data); //snapshot
    });
}

const getSortedPositions = () => {
    var dbRef = firebase.database().ref();
    dbRef.orderByChild("coin").on("child_added", snap => {
        // console.log(snap.val());
    });
}

let cards = ``;
let orderHistory = ``;
let positions = [];
let porfolioValue = 0; // this is actually amount invested
let porfolioWorth = 0;
let tickers = ["exampleTicker"];
const renderDataAsHtml = (data) => {
    let cardArr = [];
    cards = ``;
    orderHistory = ``;
    console.log(data);
    for (const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        // console.log(ticker);
        if (position.status == "in") {
            // if (!cardArr.includes(ticker)){
            cards += createCard(position, positionItem) // For each position create an HTML card
            cardArr.push(ticker);
            console.log(cardArr);
            // }
            tickers.push(ticker);
            positions.push(position);
            let positionValue = (position.amount) * (position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount) * (getPrice(position.coin)));
            orderHistory += createOrder(position, positionItem) // For each position create an HTML card
        }
        else if (position.status == "out") {
            orderHistory += createOrder(position, positionItem) // For each position create an HTML card
        }
    };
    console.log(cards);
    document.querySelector('#app').innerHTML = cards;
    console.log(orderHistory);
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
    let gain = (((position.amount) * (getPrice(position.coin))) - (position.amount) * ((position.price)));
    let gainSymbol = "";
    if (gain >= 0) { gainSymbol = "+"; }
    innerHTML += `${usCurrencyFormat.format(getPrice(position.coin))} (${percentFormat.format((getPercentChange(position.coin)) / 100)})`
    innerHTML += `</p>`
    innerHTML += `<button class="card-header-icon" aria-label="more options" id="${positionItem}" onclick="sellPosition(this.id)">`
    innerHTML += `Sell`
    innerHTML += `</button>`
    innerHTML += `</header>`
    innerHTML += `</div>`
    return innerHTML;
};

const createOrder = (position, positionItem) => {
    let innerHTML = "";
    innerHTML += `<div class="card">`
    innerHTML += `<div class="columns" >`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4"><b>${position.date}</b></p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${position.coin}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${position.direction}</p></div>`
    let shownAmount = position.amount
    if (position.status == "in") { shownAmount = position.buyAmount; }
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${shownAmount}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4">${usCurrencyFormat.format(position.price)}</p></div>`
    innerHTML += `<div class="column is-2"><p class="my-3 mx-4"><b>${usCurrencyFormat.format(shownAmount * (position.price))}</b></p></div>`
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
    investElement.innerText = `Invested: ${usCurrencyFormat.format(invested)}`;
    cashElement.innerText = `Cash: ${usCurrencyFormat.format(cash)}`;
    createPieChart(invested, cash);
    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0) {
        gainSymbol = "+";
    }
    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain / 100000)}) Total`);
    modal.classList.toggle('is-active');
}

const updateInvested = () => {
    porfolioValue = 0;
    porfolioWorth = 0;
    const messagesRef = firebase.database().ref();
    messagesRef.on('value', (snapshot) => {
        data = snapshot.val();
        // console.log(data);
    });
    for (const positionItem in data) {
        const position = data[positionItem];
        if (position.status == "in") {
            let positionValue = (position.amount) * (position.price);
            porfolioValue += positionValue;
            porfolioWorth += ((position.amount) * (getPrice(position.coin)));
        }
    };
    cash = 100000 - porfolioValue;
    investElement.innerText = `Invested: ${usCurrencyFormat.format(porfolioValue)}`;
    cashElement.innerText = `Cash: ${usCurrencyFormat.format(cash)}`;
    createPieChart(porfolioValue, cash);

    let gain = (porfolioWorth - porfolioValue);
    let gainSymbol = "";
    if (gain >= 0) {
        gainSymbol = "+";
    }

    valueElement.innerText = (usCurrencyFormat.format((porfolioWorth + cash)));
    gainElement.innerText = (`${gainSymbol + usCurrencyFormat.format(gain)} (${gainSymbol + percentFormat.format(gain / 100000)}) Total`);
}

// ------ Pi Chart -------------------------------------------------------------------------------------
const createPieChart = (invested, cash) => {
    google.charts.load('current', { 'packages': ['corechart'] });
    google.charts.setOnLoadCallback(drawChart);
    // Draw the chart and set the chart values
    function drawChart() {
        var data = google.visualization.arrayToDataTable([
            ['Distripution', 'Percent'],
            ['Invested', invested],
            ['Cash', cash]
        ]);
        var options = { 'legend': 'none' }; //remove legend
        // Display the chart inside the <div> element with id="piechart"
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        chart.draw(data, options);
    }
}


// -------- USE FOR SEARCH PAGE --------------------------------------------------------------
// -------- BUY POSITIONS --------------------------------------------------------------------
const buyEth = (coinName) => {
    const buyAmount = prompt("How many coins would you like to buy?");
    console.log("running");
    const newAmount = parseFloat(buyAmount);
    const newPrice = getPrice(coinName);

    console.log({
        price: newPrice,
        amount: newAmount
    });

    if (tickers.includes(coinName)) { //see if there is a current position
        console.log("you already have a position in this crypto.");
        //update the current position
        updateCurrentPosition(newPrice, newAmount, coinName);
    }
    else {
        console.log("you are entering a new position.");
        console.log(tickers);
        firebase.database().ref().push({
            coin: coinName,
            price: newPrice,
            amount: newAmount,
            buyAmount: newAmount,
            status: "in",
            direction: "buy",
            date: dateToday,
            watch: false
        })
    }
    // updateInvested(); //update the amount invested number shown on screen
}

const updateCurrentPosition = (newPrice, newAmount, coinName) => {
    for (const positionItem in data) {
        const position = data[positionItem];
        let ticker = position.coin;
        console.log(ticker);
        if (ticker == coinName && position.status == "in") {
            console.log("match");
            const oldAmount = parseFloat(position.amount);
            const oldPrice = parseFloat(position.price)
            const positionEdit = {
                price: ((((oldPrice) * (oldAmount)) + (newPrice * newAmount)) / (oldAmount + newAmount)),
                amount: oldAmount + newAmount
            }
            firebase.database().ref(positionItem).update(positionEdit);
        }
    }
}

const createOrderHistoryPoint = (newPrice, newAmount, coinName) => {
    const watchRef = firebase.database().ref();
    watchRef.on('value', (snapshot) => {
        data = snapshot.val();
        for (const positionItem in data) {
            const position = data[positionItem];
            const oldAmount = parseFloat(position.amount);
            const oldPrice = parseFloat(position.price);
            firebase.database().ref().push({
                coin: coinName,
                price: ((((oldPrice) * (oldAmount)) + (newPrice * newAmount)) / (oldAmount + newAmount)),
                amount: oldAmount + newAmount,
                buyAmount: newAmount,
                status: "in",
                direction: "buy",
                date: dateToday,
                watch: false
            })
        }
    });
}

// -------- SEARCH FEATURES --------------------------------------------------------------------
const startSearch = () => {
    const searchInput = document.querySelector('#search').value;
    let url = "https://api.binance.com/api/v1/ticker/24hr";

    fetch(url)
        .then(response => response.json()) // read JSON response
        .then(myjson => {
            console.log("finding coin");
            const results = document.querySelector('#results');
            results.innerHTML = "";
            for (coinElement in myjson) {
                const coinData = myjson[coinElement];
                const ticker = `${searchInput}USDT`;
                if (ticker === coinData.symbol) {
                    displayAbout(searchInput);
                    results.innerHTML += `<div class="card">
                            <header class="card-header">
                                <p class="card-header-title ">
                                ${searchInput}
                                </p>
                                <p class="card-header-title ">
                                $${getPrice(searchInput)}
                                </p>
                                <button class="card-header-icon button" aria-label="more options" onclick="buyEth('${searchInput}')">
                                Buy
                                </button>
                                <button class="card-header-icon button" aria-label="more options" onclick="addCoin(${getPrice(searchInput)}, '${searchInput}')">
                                Add
                                </button>
                            </header>
                        </div>`;
                }
            }
            new TradingView.widget(
                {
                    "container_id": "basic-area-chart",
                    "width": 998,
                    "height": 610,
                    "symbol": searchInput + "USD",
                    "interval": "D",
                    "timezone": "exchange",
                    "theme": "light",
                    "style": "3",
                    "toolbar_bg": "#f1f3f6",
                    "hide_top_toolbar": true,
                    "save_image": false,
                    "locale": "en"
                }
            );
        })
        .catch(error => {
            console.log(error); // Log error if there is one
        })
};

const displayAbout = (coinName) => {
    // const searchInput = document.querySelector('#search').value;
    let url = "https://api.binance.com/api/v1/ticker/24hr";

    fetch(url)
        .then(response => response.json()) // read JSON response
        .then(myjson => {
            console.log("displaying about");
            const name = document.querySelector('#name');
            const ohl = document.querySelector('#ohl');
            const vol = document.querySelector('#volume');
            const quote = document.querySelector('#quote');
            const change = document.querySelector('#change');
            const percent = document.querySelector('#percent');
            const weight = document.querySelector('#weight');
            for (coinElement in myjson) {
                const coinData = myjson[coinElement];
                const ticker = `${coinName}USDT`;
                if (ticker === coinData.symbol) {
                    name.innerHTML = `${coinName}`
                    ohl.innerHTML = `O/H/L: ${usCurrencyFormat.format(coinData.openPrice)}/${usCurrencyFormat.format(coinData.highPrice)}/${usCurrencyFormat.format(coinData.lowPrice)}`
                    vol.innerHTML = `Volume: ${coinData.volume}`
                    quote.innerHTML = `Quote Volume: ${coinData.quoteVolume}`
                    change.innerHTML = `Price Change: ${usCurrencyFormat.format(coinData.priceChange)}`
                    percent.innerHTML = `Price Change Percent: ${coinData.priceChangePercent}%`
                    weight.innerHTML = `Weighted Average Price: ${usCurrencyFormat.format(coinData.weightedAvgPrice)}`
                }
            }
        })
        .catch(error => {
            console.log(error); // Log error if there is one
        })
}

// -------- DISPLAY WATCHLIST --------------------------------------------------------------------
const displayWatch = () => {
    console.log("hit here");
    const watchRef = firebase.database().ref('watched');
    watchRef.on('value', (snapshot) => {
        data = snapshot.val();
        let cards = ``;
        for (const positionItem in data) {
            const position = data[positionItem];
            console.log(position);
            if (position != "neither") {
                cards += `<d
            iv class="card">
                            <header class="card-header">
                                <p class="card-header-title ">
                                ${position.coinName}
                                </p>
                                <p class="card-header-title ">
                                $${getPrice(position.coinName)}
                                </p>
                                <button class="card-header-icon" aria-label="more options" onclick="buyEth('${position.coinName}')">
                                Buy
                                </button>
                            </header>
                        </div>`;
            }
        }
        const watchId = document.querySelector("#watch");
        console.log(cards);
        watchId.innerHTML = cards;
    });
};

const addTopTenCoin = (coinName) => {
    addCoin(getPrice(coinName), coinName);
};

//add to watchlist
const addCoin = (coinPrice, coinName) => {
    const watchRef = firebase.database().ref('watched');
    watchRef.on('value', (snapshot) => {
        data = snapshot.val();
        let isWatched = false;
        for (const positionItem in data) {
            const position = data[positionItem];
            if (position.coinName === coinName) {
                isWatched = true;
            }
        }
        if (!isWatched) {
            firebase.database().ref('watched').push({
                coinName: coinName,
                coinPrice: coinPrice,
                watch: true
            });
        }
    });
};

// -------- DISPLAY TOP TEN --------------------------------------------------------------------

let BTCgainSymbol = "";
if (getPercentChange("BTC") >= 0) { BTCgainSymbol = "+"; }
let ETHgainSymbol = "";
if (getPercentChange("ETH") >= 0) { ETHgainSymbol = "+"; }
let BNBgainSymbol = "";
if (getPercentChange("BNB") >= 0) { BNBgainSymbol = "+"; }
let ADAgainSymbol = "";
if (getPercentChange("ADA") >= 0) { ADAgainSymbol = "+"; }
let XRPgainSymbol = "";
if (getPercentChange("XRP") >= 0) { XRPgainSymbol = "+"; }
let USDCgainSymbol = "";
if (getPercentChange("USDC") >= 0) { USDCgainSymbol = "+"; }
let DOGEgainSymbol = "";
if (getPercentChange("DOGE") >= 0) { DOGEgainSymbol = "+"; }
let DOTgainSymbol = "";
if (getPercentChange("DOT") >= 0) { DOTgainSymbol = "+"; }




let BTCelement = document.getElementById("priceBTC");
BTCelement.innerText = `${usCurrencyFormat.format(getPrice("BTC"))} (${BTCgainSymbol + getPercentChange("BTC")}%)`;
let ETHelement = document.getElementById("priceETH");
ETHelement.innerText = `${usCurrencyFormat.format(getPrice("ETH"))} (${ETHgainSymbol + getPercentChange("ETH")}%)`;
let BNBelement = document.getElementById("priceBNB");
BNBelement.innerText = `${usCurrencyFormat.format(getPrice("BNB"))} (${BNBgainSymbol + getPercentChange("BNB")}%)`;
let ADAelement = document.getElementById("priceADA");
ADAelement.innerText = `${usCurrencyFormat.format(getPrice("ADA"))} (${ADAgainSymbol + getPercentChange("ADA")}%)`;
let XRPelement = document.getElementById("priceXRP");
XRPelement.innerText = `${usCurrencyFormat.format(getPrice("XRP"))} (${XRPgainSymbol + getPercentChange("XRP")}%)`;
let USDCelement = document.getElementById("priceUSDC");
USDCelement.innerText = `${usCurrencyFormat.format(getPrice("USDC"))} (${USDCgainSymbol + getPercentChange("USDC")}%)`;
let DOGEelement = document.getElementById("priceDOGE");
DOGEelement.innerText = `${usCurrencyFormat.format(getPrice("DOGE"))} (${DOGEgainSymbol + getPercentChange("DOGE")}%)`;
let DOTelement = document.getElementById("priceDOT");
DOTelement.innerText = `${usCurrencyFormat.format(getPrice("DOT"))} (${DOTgainSymbol + getPercentChange("DOT")}%)`;