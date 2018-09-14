module.exports = (bot, config, db, array_rand, sleep) => {

    bot.onText(/\/ping/, async (msg, match) => {
        const msgId = msg.message_id;
        const chatId = msg.chat.id;
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            await bot.sendMessage(chatId, '/pong', { reply_to_message_id: msgId })
        }
    });

    bot.onText(/\/info/, async (msg, match) => {
        const msgId = msg.message_id;
        const chatId = msg.chat.id;
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            await bot.sendMessage(chatId, JSON.stringify(msg, '', 4), { reply_to_message_id: msgId })
        }
    });

    bot.onText(/\/bbreg/, async (msg, match) => {
        const msgId = msg.message_id;
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            const chatObj = await db.collection('chats').findOne({ _id: chatId });
            if (chatObj) {
                const userObj = await db.collection('users').findOne({ _id: userId, 'state.bbgame': 'active'});
                if (!userObj) {
                    const username = (msg.from.username) ? '@' + msg.from.username : msg.from.last_name;
                    const userObj = {
                        _id: userId,
                        first_name: msg.from.first_name,
                        username: username,
                        chat: chatId,
                        points: {
                            bbgame: 0
                        },
                        state: {
                            bbgame: 'active'
                        },
                        awards: {
                            bbgame: ''
                        },
                        settings: {}
                    }
                    await db.collection('users').insertOne(userObj);
                    await bot.sendMessage(chatId, config.modePhrases[chatObj.mode].reg, { reply_to_message_id: msgId });                
                } else if(userObj.chat != chatId){                    
                    userObj.chat = chatId;
                    await db.collection('users').updateOne({_id: userId}, {$set: userObj});                    
                    await bot.sendMessage(chatId, 'Чат змінено.', { reply_to_message_id: msgId });                
                }else{
                    await bot.sendMessage(chatId, config.modePhrases[chatObj.mode].allreadyReg, { reply_to_message_id: msgId });
                }
            } else {
                await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', { reply_to_message_id: msgId });
            }
        }
    });

    bot.onText(/\/bbstat/, async (msg, match) => {
        const chatId = msg.chat.id;
        const msgId = msg.message_id;
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            const chatObj = await db.collection('chats').findOne({ _id: chatId });
            if (chatObj) {
                const usersArr = await db.collection('users').find({ chat: chatId, 'state.bbgame': 'active' }).sort({ 'points.bbgame': -1 }).toArray();
                if (usersArr.length > 0) {
                    let string = '';
                    let i = 1;
                    usersArr.forEach(async (user) => {
                        let award = (user.awards.bbgame) ? user.awards.bbgame : '';
                        string = string + '▪️ ' + i + ' ' + award + ' [' + user.first_name + '](tg://user?id=' + user._id + ') ' + user.points.bbgame + ' раз(ів)\n';
                        i++;
                    });
                    await bot.sendMessage(chatId, config.modePhrases[chatObj.mode].stats + '\n' + string, { parse_mode: 'markdown' });
                } else {
                    bot.sendMessage(chatId, 'В чаті немає гравців.');
                }
            } else {
                await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', { reply_to_message_id: msgId });
            }
        }
    });

    bot.onText(/\/bbmod[^_]/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            const modesArr = Object.values(config.modes);
            if (modesArr.length > 0) {
                let string = '';
                let i = 1;
                modesArr.forEach(async (mode) => {
                    string = string + i + '. ' + mode + ' - /bbmod_' + i + ' \n';
                    i++;
                });
                bot.sendMessage(chatId, 'Вкажіть модифікацію: \n' + string);
            } else {
                bot.sendMessage(chatId, 'Модифікації відсутні.');
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
                genModCommand(msg, mode);
                bot.deleteMessage(chatId, msgId);
            }
        } else {
            await bot.sendMessage(chatId, 'Чо, хитровиїбаний?');
        }
    });

    async function genModCommand(msg, mode) {
        const chatId = msg.chat.id;
        const modeName = config.modes[mode];
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            let chatObj = await db.collection('chats').findOne({ _id: chatId });
            if (!chatObj) {
                chatObj = {
                    _id: chatId,
                    title: msg.chat.title,
                    mode: mode,
                    winners: {},
                    settings: {
                        offline: 0
                    }
                }
                await db.collection('chats').insertOne(chatObj);
                await bot.sendMessage(chatId, '<b>' + modeName + '</b> активовано.', { parse_mode: 'HTML' })
            } else {
                chatObj.mode = mode;
                await db.collection('chats').updateOne({ _id: chatId }, { $set: chatObj });
                await bot.sendMessage(chatId, 'Мод змінено на <b>' + modeName + '</b>', { parse_mode: 'HTML' });
            }
        }
    }

    bot.onText(/\/bbgame/, async (msg, match) => {
        const msgId = msg.message_id;
        const chatId = msg.chat.id;  
        const random = require('random');      
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
            const chatObj = await db.collection('chats').findOne({ _id: chatId });
            if (chatObj) {
                if(chatObj.settings.offline == 0){
                    const usersArr = await db.collection('users').find({ chat: chatId, 'state.bbgame': 'active' }).toArray();
                    if (usersArr.length != 0){
                        if (usersArr.length >= config.settings.stage.first.winners){

                            const mode = chatObj.mode;
                            const modePhrasesArr = Object.values(config.modePhrases);
                            const modeAwardsArr = Object.values(config.modeAwards[mode]);
                            const usersArr = await db.collection('users').find({ chat: chatId, 'state.bbgame': 'active' }).toArray();

                            let randomWinner = await array_rand(usersArr);
                            let winnersFirstArr = [await randomWinner(),await randomWinner()];
                            let randomWinnerSecond = await array_rand(winnersFirstArr);
                            let winner = [await randomWinnerSecond()];                           
                            let winnerString = '';                            
                            
                            winnersFirstArr.forEach(async (id) => {
                                winnerString = winnerString + '[' + id.first_name + '](tg://user?id=' + id._id + ')\n';
                            });
                            
                            let modePhrasesArrLenght = 3;
                            let randFirst = random.int(0 , modePhrasesArrLenght);
                            let randSecond = random.int(0 , modePhrasesArrLenght);
                            let randThird = random.int(0 , modePhrasesArrLenght);
                            let randFourth = random.int(0 , modePhrasesArrLenght);
                            let randFifth = random.int(0 , modePhrasesArrLenght);

                            await bot.sendMessage(chatId, modePhrasesArr[mode - 1].stage[1][randFirst], sleep.sleep(config.settings.stage.first.delayMessage));
                            await bot.sendMessage(chatId, modePhrasesArr[mode - 1].stage[2][randSecond], sleep.sleep(config.settings.stage.first.delayMessage));
                            await bot.sendMessage(chatId, modePhrasesArr[mode - 1].stage[3][randThird] + '\n' + winnerString, { parse_mode: 'markdown' }, sleep.sleep(config.settings.stage.first.delayWinners));
                            await bot.sendMessage(chatId, modePhrasesArr[mode - 1].stage[4][randFourth], sleep.sleep(config.settings.stage.second.delayMessage));
                            await bot.sendMessage(chatId, modePhrasesArr[mode - 1].stage[5][randFifth] + '\n' +  winner[0].first_name + ' ' + winner[0].username , { parse_mode: 'HTML' }, sleep.sleep(config.settings.stage.second.delayWinners));
                            
                            const winnerObj = await db.collection('users').findOne({ _id: winner[0]._id });
                            winnerObj.points.bbgame = winnerObj.points.bbgame + 1;
                            await db.collection('users').updateOne({ _id: winner[0]._id }, { $set: winnerObj });

                            modeAwardsArr.forEach(async (award) => {
                                if (winnerObj.points.bbgame >= award.pointsmin && winnerObj.points.bbgame <= award.pointsmax && winnerObj.awards.bbgame != award.name) {
                                    await bot.sendMessage(chatId, '🎉🎉🎉 [' + winner[0].first_name + '](tg://user?id=' + winner[0]._id + ') отримує нове звання: ' + award.name, { parse_mode: 'markdown' }, sleep.sleep(2));                                    
                                    winnerObj.awards.bbgame = award.name;                                    
                                    await db.collection('users').updateOne({ _id: winner[0]._id }, { $set: winnerObj });                                    
                                };                                
                            });

                            chatObj.settings.offline = 1;
                            chatObj.winners = winnerObj;
                            await db.collection('chats').updateOne({_id: chatId}, {$set: chatObj});
                            
                        } else {
                            await bot.sendMessage(chatId, 'В чаті недостатньо гравців. Мінімум: ' + config.settings.stage.first.winners, { reply_to_message_id: msgId });    
                        }
                    } else{
                        await bot.sendMessage(chatId, 'В чаті немає гравців.', { reply_to_message_id: msgId });    
                    }                        
                } else {
                    const mode = chatObj.mode;
                    const modePhrasesArr = Object.values(config.modePhrases);                    
                    await bot.sendMessage(chatId, modePhrasesArr[mode - 1].already + '[' + chatObj.winners.first_name + '](tg://user?id=' + chatObj.winners._id + ')', { reply_to_message_id: msgId, parse_mode: 'markdown' });    
                }
            } else {                
                await bot.sendMessage(chatId, 'Спочатку оберіть модифікацію для чату - /bbmod', { reply_to_message_id: msgId });
            };
        };
    });

    bot.onText(/\/bbreset/, async (msg, match) => {
        const chatId = msg.chat.id;
        await db.collection('users').updateMany({chat: chatId}, {$set: {'points.bbgame': 0, 'awards.bbgame': ''}});
        await db.collection('chats').updateOne({_id: chatId}, {$set: {winners: {}, 'settings.offline': 0}});
        bot.sendMessage(chatId, 'Результати скинуто');
    });
};