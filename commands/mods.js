const сhatReg = require('../utils/сhatReg');

module.exports = (bot, config, db) => {
	bot.onText(/\/bbmod[^_]/, async (msg) => {
		const chatId = msg.chat.id;
		if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			const modesArr = Object.values(config.modes);
			if (modesArr.length > 0) {
				let string = '';
				let i = 1;
				modesArr.forEach(async (mode) => {
					string = `${string}${i}. ${mode}	/bbmod_${i} \n`;
					i++;
				});
				bot.sendMessage(chatId, `Вкажіть модифікацію:\n${string}`);
			} else {
				bot.sendMessage(chatId, 'Модифікації відсутні в конфігурації.');
			}
		}
	});

	bot.onText(/\/bbmod_(\d)/, async (msg, match) => {
		const msgId = msg.message_id;
		const chatId = msg.chat.id;
		const mode = match[1];
		const modeArr = Object.values(config.modes);
		if (mode <= modeArr.length && mode > 0) {
			if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
				await сhatReg(msg, mode, bot, config, db);
				try {
					await bot.deleteMessage(chatId, msgId);									
				} catch (error) {
					if (error.message == "ETELEGRAM: 400 Bad Request: message can't be deleted"){
						bot.sendMessage(chatId, 'Потрібні права адміністратора для видалення повідомлень.', {
							reply_to_message_id: msgId
						});
					}
				}
			}
		} else {
			await bot.sendMessage(chatId, 'Чо, хитровиїбаний?');
		}
	});
};