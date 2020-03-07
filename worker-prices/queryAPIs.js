require('dotenv').config();

const CoinbasePro 	= require('coinbase-pro');
const request 		= require('request');
const PublicClient 	= new CoinbasePro.PublicClient();
const mongoUtil 	= require('./../database');
const PriceAlertMng	= require('./priceAlertManager');

const Coinbase = {
	prices: {},
	start: () => {
		PublicClient
			.getProducts()
			.then(data => {
				const ids = data.map(({ id }) => id);
				Coinbase.startWebsocket(ids);
				Coinbase.addPrices();
			})
			.catch(error => {
				console.error(error);
			});
	},
	addPrices: () => {
		setInterval( t => {
			PriceAlertMng.addPriceForExchange('CoinbasePro', Coinbase.prices, (e, data)=> {});
		}, 1000);
	},
	startWebsocket:(ids) => {
		const websocket = new CoinbasePro.WebsocketClient(ids);
		websocket.on('message', data => {
			const { price, product_id } = data;
			if(product_id !== undefined && price !== undefined)
			Coinbase.prices[product_id] = price;
		});
		websocket.on('error', err => {

		});
		websocket.on('close', () => {

		});
	}
}

const exchangeHTTPRequest = (url, callback) => {
	request({ url: url, json: true, method: "GET", timeout: 10000}, (err, res, body) => {
		if(err) 
			return console.error(err); 
		callback(body);
	});
}

const requestLoop = (milliseconds, url, callback) => {
	setInterval(() => {
		exchangeHTTPRequest(url, callback);
	}, milliseconds);
}

const Bitmex = {
	start: () => {
		requestLoop(3000, process.env.BITMEX_PRICES_URL, (data) => {
			if(!Array.isArray(data)) {
				return;
			}

			const prices = data.reduce((acc, { symbol, close }) => {
				acc[symbol]= close * 1 ;
				return acc;
			}, {});
			PriceAlertMng.addPriceForExchange('Bitmex', prices, (e, data)=> {});
		});
	}
}

const Binance = {
	start: () => {
		requestLoop(1000, process.env.BINANCE_PRICES_URL, (data) => {
			const prices = data.reduce((acc, { symbol, price }) => {
				acc[symbol] = price * 1 ;
				return acc;
			}, {});
			PriceAlertMng.addPriceForExchange('Binance', prices, (e, data)=> {});
		});
	}
}

Coinbase.start();
Bitmex.start();
Binance.start();
