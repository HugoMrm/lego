const cron = require('node-cron');
const { fullSync } = require('../controllers/syncController');
const logger = console; // Remplacez par votre logger si nécessaire

let isRunning = false;

async function runSync() {
  if (isRunning) {
    logger.warn('⚠️ Synchronisation déjà en cours');
    return;
  }

  try {
    isRunning = true;
    logger.info('⏰ Début de la synchronisation');
    await fullSync();
    logger.info('✅ Synchronisation terminée avec succès');
  } catch (err) {
    logger.error('❌ Erreur lors de la synchronisation:', err);
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  // Version de test : toutes les 5 secondes
  if (process.env.NODE_ENV === 'test') {
    cron.schedule('*/5 * * * * *', runSync); // Secondes: */5 = toutes les 5s
    logger.info('🔄 Mode TEST activé - Synchronisation toutes les 5 secondes');
  } 
  // Version production : toutes les heures
  else {
    cron.schedule('0 * * * *', runSync); // Toutes les heures à :00
    logger.info('⏱ Mode PROD - Synchronisation horaire activée');
  }

  // Optionnel: Lancer immédiatement au démarrage
  runSync().catch(err => logger.error('Erreur initiale:', err));
}

module.exports = { startScheduler, runSync };