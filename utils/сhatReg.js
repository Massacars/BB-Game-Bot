module.exports = async function сhatReg(msg, mode, bot, config, db) {
	const chatId = msg.chat.id;
	const modeName = config.modes[mode];
	if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
		let chatObj = await db.collection('chats').findOne({
			_id: chatId
		});
		if (!chatObj) {
			chatObj = {
				_id: chatId,
				title: msg.chat.title,
				mode: mode,
				winners: {
					[mode]: {}
				},
				points: {
					[mode]: {}
				},
				awards:{
					[mode]: {}
				},
				players: [],

				settings: {
					offline: 0,
					storage:{
						status: 'off',
						data: [] 
					}
				}				
			};
			await db.collection('chats').insertOne(chatObj);
			await bot.sendMessage(chatId, `<b>${modeName}</b> активовано.`, {
				parse_mode: 'HTML'
			});
			await bot.sendMessage(chatId, 'Щоб прийняти участь в грі, потрібно зреєструватись /bbreg\n\nДля старту натисніть /bbgame.\nДля перегляду статистики /bbstats', {
				parse_mode: 'HTML'
			});			
		} else {
			chatObj.mode = mode;
			await db.collection('chats').updateOne({
				_id: chatId
			}, {
				$set: chatObj
			});
			await bot.sendMessage(chatId, `Мод змінено на <b>${modeName}</b>`, {
				parse_mode: 'HTML'
			});
		}
	}
};