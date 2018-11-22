module.exports = (bot, config, db) => {

	async function randomPhrase(phrasesArr) {
		const random = require('random');
		let randomPhraseNumber = await random.int(0, phrasesArr.length - 1);
		return phrasesArr[randomPhraseNumber];
	}

	async function randomWinner(arr) {
		const uniqueRandomArray = require('unique-random-array');
		const winnerFunc = await uniqueRandomArray(arr);
		const winner = await winnerFunc();
		return winner;
	}

	async function winnersObjGenerator(playersArr, settings) {
		let winnersArr = [];
		let winnerObj = {
			string: '',
			arr: []
		};
		for (let i = 1; i <= settings; i++) {
			winnersArr.push(await randomWinner(playersArr));
		}
		for (let winner of winnersArr) {
			const userObj = await db.collection('users').findOne({
				_id: winner
			});
			winnerObj.string = `${winnerObj.string}${userObj.first_name} ${userObj.username}\n`;
			winnerObj.arr.push(winner);
		}
		return winnerObj;
	}

	async function updateChatData(chatId, winner) {
		let chatObj = await db.collection('chats').findOne({
			_id: chatId
		});
		const mod = chatObj.mode;

		chatObj.winners[mod] = {
			lastWinner: winner
		};

		let points = 0;
		if (chatObj.points[mod][winner]) {
			points = chatObj.points[mod][winner] + 1;
		} else {
			points = 1;
		}

		chatObj.points[mod][winner] = points;
		chatObj.settings.storage.data = [];
		chatObj.settings.storage.status = 'off';
		// chatObj.settings.offline = 1;
		await db.collection('chats').updateOne({
			_id: chatId
		}, {
			$set: chatObj
		});
	}

	async function updateAwards(chatId, awardsArr, winner) {
		let chatObj = await db.collection('chats').findOne({
			_id: chatId
		});
		const userObj = await db.collection('users').findOne({
			_id: winner
		});		
		const mod = chatObj.mode;
		const awards = chatObj.awards[mod][winner];
		const points = chatObj.points[mod][winner];

		for (let award of awardsArr){
			if (points >= award.pointsmin && points <= award.pointsmax && awards != award.name) {
				chatObj.awards[mod][winner] = award.name;
				await db.collection('chats').updateOne({
					_id: chatId
				}, {
					$set: chatObj
				});
				const awardObj = {
					first_name: userObj.first_name,
					username: userObj.username,
					award: award.name
				};
				return awardObj;			
			}	
		}	
	}


	bot.onText(/\/bbgame/, async (msg) => {
		const sleep = require('sleep');
		const msgId = msg.message_id;
		const chatId = msg.chat.id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			let chatObj = await db.collection('chats').findOne({
				_id: chatId
			});
			if (chatObj) {
				const mode = chatObj.mode;
				const modText = config.modePhrases[mode];
				const modSettings = config.modeSettings[mode];
				const modAwards = config.modeAwards[mode];
				if (chatObj.settings.offline == 0) {
					const playersArr = chatObj.players;
					if (playersArr.length != 0) {
						if (playersArr.length >= 1) {
							const modePhrasesArr = Object.values(modText.stage);
							const modeAwardsArr = Object.values(modAwards);
							const modeStagesArr = Object.values(modSettings.stage);

							let i = 0;
							for (let stage of modeStagesArr) {
								const winnersAmount = stage.winners;
								const delay = stage.delayMessage;
								const phrase = await randomPhrase(modePhrasesArr[i]);
								if (winnersAmount == 0) {
									await bot.sendMessage(chatId, phrase, sleep.sleep(delay));
								} else {
									const winnersStorage = await db.collection('chats').findOne({
										_id: chatId,
										'settings.storage.status': 'active'
									});
									if (winnersStorage) {
										const winnersArr = winnersStorage.settings.storage.data;
										const winnerObj = await winnersObjGenerator(winnersArr, winnersAmount);
										await bot.sendMessage(chatId, phrase, sleep.sleep(delay), {
											parse_mode: 'markdown'
										});
										await bot.sendMessage(chatId, winnerObj.string, sleep.sleep(delay), {
											parse_mode: 'markdown'
										});
										await db.collection('chats').updateOne({
											_id: chatId
										}, {
											$set: {
												'settings.storage.data': winnerObj.arr
											}
										});
									} else {
										const winnersObj = await winnersObjGenerator(playersArr, winnersAmount);										
										await bot.sendMessage(chatId, phrase, sleep.sleep(delay), {
											parse_mode: 'markdown'
										});
										await bot.sendMessage(chatId, winnersObj.string, sleep.sleep(delay), {
											parse_mode: 'markdown'
										});
										await db.collection('chats').updateOne({
											_id: chatId
										}, {
											$set: {
												'settings.storage.status': 'active',
												'settings.storage.data': winnersObj.arr
											}
										});
									}
									i++;
								}								
								i++;
							}

							let chatObjupdated = await db.collection('chats').findOne({
								_id: chatId
							});
							await updateChatData(chatId, chatObjupdated.settings.storage.data[0]);
							const awardObj = await updateAwards(chatId, modeAwardsArr, chatObjupdated.settings.storage.data[0]);
							if (awardObj){
								await bot.sendMessage(chatId, `🎉🎉🎉  ${awardObj.first_name} ${awardObj.username} отримує нове звання: ${awardObj.award}`, {
									parse_mode: 'markdown'
								}, sleep.sleep(2));							
							}
						} else {
							await bot.sendMessage(chatId, 'В чаті недостатньо гравців. Мінімум: ' + config.settings.stage.first.winners, {
								reply_to_message_id: msgId
							});
						}
					} else {
						await bot.sendMessage(chatId, 'В чаті немає гравців.', {
							reply_to_message_id: msgId
						});
					}
				} else {
					const mode = chatObj.mode;
					const modePhrasesArr = Object.values(config.modePhrases);
					await bot.sendMessage(chatId, modePhrasesArr[mode - 1].already + '[' + chatObj.winners.first_name + '](tg://user?id=' + chatObj.winners._id + ')', {
						reply_to_message_id: msgId,
						parse_mode: 'markdown'
					});
				}
			} else {
				await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', {
					reply_to_message_id: msgId
				});
			}
		}
	});    
};