module.exports = (bot, config, db) => {

	bot.onText(/\/ping/, async (msg) => {
		const msgId = msg.message_id;
		const chatId = msg.chat.id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			await bot.sendMessage(chatId, '/pong', {
				reply_to_message_id: msgId
			});
		}
	});

	bot.onText(/\/info/, async (msg) => {
		const msgId = msg.message_id;
		const chatId = msg.chat.id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			await bot.sendMessage(chatId, JSON.stringify(msg, '', 4), {
				reply_to_message_id: msgId
			});
		}
	});

	bot.onText(/\/bbreg/, async (msg) => {
		const msgId = msg.message_id;
		const chatId = msg.chat.id;
		const userId = msg.from.id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			const chatObj = await db.collection('chats').findOne({
				_id: chatId
			});
			if (chatObj) {
				const userObj = await db.collection('users').findOne({
					_id: userId
				});
				const modeText = config.modePhrases[chatObj.mode];
				const playersArr = chatObj.players;
				if (!userObj) {
					const username = (msg.from.username) ? `@${msg.from.username}` : msg.from.last_name;
					const userObj = {
						_id: userId,
						first_name: msg.from.first_name,
						username: username,
						settings: {}
					};
					await db.collection('users').insertOne(userObj);
					await db.collection('chats').updateOne({
						_id: chatId
					}, {
						$push: {
							players: userId
						}
					});
					await bot.sendMessage(chatId, modeText.reg, {
						reply_to_message_id: msgId
					});
				} else if (playersArr.indexOf(userId) == -1) {
					await db.collection('chats').updateOne({
						_id: chatId
					}, {
						$push: {
							players: userId
						}
					});
					await bot.sendMessage(chatId, modeText.reg, {
						reply_to_message_id: msgId
					});
				} else {
					await bot.sendMessage(chatId, modeText.allreadyReg, {
						reply_to_message_id: msgId
					});
				}
			} else {
				await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', {
					reply_to_message_id: msgId
				});
			}
		}
	});

	bot.onText(/\/bbstat/, async (msg) => {
		const chatId = msg.chat.id;
		const msgId = msg.message_id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			const chatObj = await db.collection('chats').findOne({
				_id: chatId
			});
			if (chatObj) {
				const chatObj = await db.collection('chats').findOne({
					_id: chatId
				});
				const modeText = config.modePhrases[chatObj.mode];
				const playersArr = chatObj.players;
				const mode = chatObj.mode;
				const awardsObj = chatObj.awards[mode];
				const pointsObj = chatObj.points[mode];
				if (playersArr.length > 0) {
					let string = '';
					let i = 1;
					for (const user of playersArr) {
						const userObj = await db.collection('users').findOne({
							_id: user
						});
						string = `${string}▪️ ${i} ${awardsObj.user} [${userObj.first_name}](tg://user?id=${userObj._id}) ${pointsObj.user} раз(ів)\n`;
						i++;
					}
					await bot.sendMessage(chatId, modeText.stats + '\n' + string, {
						parse_mode: 'markdown'
					});
				} else {
					await bot.sendMessage(chatId, 'В чаті немає гравців.');
				}
			} else {
				await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', {
					reply_to_message_id: msgId
				});
			}
		}
	});

	bot.onText(/\/bbreset/, async (msg) => {
		const chatId = msg.chat.id;
		await db.collection('users').updateMany({
			chat: chatId
		}, {
			$set: {
				'points.bbgame': 0,
				'awards.bbgame': ''
			}
		});
		await db.collection('chats').updateOne({
			_id: chatId
		}, {
			$set: {
				winners: {},
				'settings.offline': 0
			}
		});
		bot.sendMessage(chatId, 'Результати скинуто');
	});

	bot.onText(/\/bbhardreset/, async (msg) => {
		const chatId = msg.chat.id;
		db.collection('users').deleteMany({});
		db.collection('chats').deleteMany({});
		bot.sendMessage(chatId, 'Hard Reset Done');
	});
};