module.exports = (bot, config, db, scheduler) => {
// 	const resetBBGame = new scheduler.RecurrenceRule();
// 	resetBBGame.hour = config.settings.reset.hour;
// 	resetBBGame.minute = config.settings.reset.minute;
// 	let dateNow = new Date;
	
// 	scheduler.scheduleJob(resetBBGame, async () => {
// 		try{
// 			await db.collection('chats').updateMany({'settings.offline': 1}, {$set: {'settings.offline': 0, winners: {}}});
// 			console.log('Chats reset ' + dateNow.toUTCString());        
// 		} catch (err) {
// 			console.log(err);            
// 		}        
// 	});    
};