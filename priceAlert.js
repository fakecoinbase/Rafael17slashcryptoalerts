const BitMEXClient 	= require('bitmex-realtime-api');
const PubSub 		= require('pubsub-js');
const tradingPairs 	= require('./app/server/modules/trading-pair-list');
const AlertManager 	= require('./app/server/modules/alert-manager');
const Telegram 		= require('./telegram');

var alerts 			= [];

const client = new BitMEXClient({testnet: false, maxTableLen: 1});

const checkAlerts = (currentPrice, pair) => {
	alerts.filter(v => v.pair == pair).map(alert => {
		if(alert.price < currentPrice*1 && alert.cross == 'Cross Up') {
			triggerAlert(alert);
		} if(alert.price > currentPrice*1 && alert.cross == 'Cross Down') {
			triggerAlert(alert);
		}
	});
}

const triggerAlert = (alert) => {
	AlertManager.deletePriceAlertById(alert._id, (e, res) => {
		if(!e) {
			AlertManager.getTelegramChatIdByUserId(alert.userId, (e, res) => {
				if(e) console.log("Telegram Chat Id not setup yet");
				else {
					const { price, cross, pair, message } = alert;
					const { telegramChatId } = res;
					const text = "Price Alert!\n" + pair + "\nPrice " + cross + " " + price + "\n" + message;
					Telegram.send(telegramChatId, text);
				}
			});
			
			PubSub.publish('UPDATE PRICE ALERT LIST');
		}
	});
	
}

/* PubSub methods */
const updatePriceAlertList = (callback) => {
	AlertManager.getAllPriceAlerts((e, res) => {
		alerts = res;
		if(typeof callback === 'function') callback();
	});
}
PubSub.subscribe('UPDATE PRICE ALERT LIST', updatePriceAlertList);


updatePriceAlertList(() => {
	client.addStream('XBTUSD', 'trade', (data, symbol, tableName) => {
		checkAlerts(data[0].price, data[0].symbol);
	});
	client.addStream('ETHUSD', 'trade', (data, symbol, tableName) => {
		checkAlerts(data[0].price, data[0].symbol);
	});
});