// ===================================================================================
// Firebase Cloud Functions
// ===================================================================================
// Este arquivo define a lógica de backend que roda nos servidores do Google.
// Cloud Functions são usadas para executar código em resposta a eventos (como
// uma escrita no banco de dados) ou em horários agendados, sem a necessidade de
// gerenciar um servidor próprio.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Configuração e Inicialização
// -----------------------------------------------------------------------------------

// Importa os módulos do Firebase necessários.
const functions = require("firebase-functions"); // Para criar e gerenciar as funções.
const admin = require("firebase-admin"); // Para acessar outros serviços do Firebase com privilégios de administrador.

// Inicializa o SDK do Firebase Admin. Isso deve ser feito apenas uma vez.
// Permite que as funções acessem o Firestore, FCM, etc., de forma segura.
admin.initializeApp();


// -----------------------------------------------------------------------------------
// Seção: Função Agendada - Verificação de Lembretes Diários
// -----------------------------------------------------------------------------------

/**
 * @name checkDueReminders
 * @type {functions.CloudFunction<functions.pubsub.Context>}
 * @description Uma Cloud Function agendada que verifica diariamente por post-its
 * com data de vencimento para o dia corrente e envia notificações push para os
 * usuários donos desses post-its.
 *
 * Gatilho: Pub/Sub (Agendamento)
 * Frequência: Todos os dias às 8:00 da manhã.
 * Fuso Horário: 'America/Sao_Paulo', para garantir consistência independentemente da
 * localização do servidor da Google.
 *
 * Regras de Negócio Implementadas:
 * 1. A função só executa se as notificações estiverem habilitadas globalmente em 'adminConfig/settings'.
 * 2. Apenas usuários com status 'premium' recebem notificações.
 * 3. Cada usuário premium tem um limite de 100 notificações por mês.
 * 4. Após enviar a notificação, o post-it é marcado como 'notificationSent: true' para evitar reenvios.
 * 5. O contador de notificações do usuário ('notificationCount') é incrementado.
 */
exports.checkDueReminders = functions.pubsub.schedule("every day 08:00")
    .timeZone("America/Sao_Paulo")
    .onRun(async (context) => {
        console.log("Iniciando verificação de lembretes diários.");

        const adminConfigRef = admin.firestore().collection("adminConfig").doc("settings");
        const adminConfig = await adminConfigRef.get();

        // Passo 1: Verificação de Ativação Geral
        if (!adminConfig.exists || !adminConfig.data().notificationsEnabled) {
            console.log("As notificações estão desativadas no painel de administração. A função será encerrada.");
            return null; // Encerra a execução da função.
        }

        // Obtém a data de hoje no formato YYYY-MM-DD para a query.
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        try {
            // Busca todos os post-its que vencem hoje e que ainda não tiveram notificação enviada.
            const querySnapshot = await admin.firestore().collection("postits")
                .where("dueDate", "==", todayString)
                .where("notificationSent", "!=", true)
                .get();

            if (querySnapshot.empty) {
                console.log("Nenhum lembrete para hoje.");
                return null;
            }

            console.log(`Encontrado(s) ${querySnapshot.size} lembrete(s) para hoje.`);

            // Processa cada lembrete encontrado.
            const promises = querySnapshot.docs.map(async (doc) => {
                const postit = doc.data();
                const userId = postit.uid;

                if (!userId) {
                    console.log(`Post-it ${doc.id} não tem UID. Pulando.`);
                    return;
                }

                const userRef = admin.firestore().collection("users").doc(userId);
                const userDoc = await userRef.get();

                // Passo 2: Verificação de Status Premium
                if (!userDoc.exists || userDoc.data().status !== "premium") {
                    console.log(`Usuário ${userId} não é premium. Pulando notificação.`);
                    return;
                }

                const userData = userDoc.data();
                const notificationCount = userData.notificationCount || 0;

                // Passo 3: Verificação do Limite de Notificações
                if (notificationCount >= 100) {
                    console.log(`Usuário ${userId} atingiu o limite de 100 notificações este mês. Pulando.`);
                    return;
                }

                // Busca os tokens de notificação do usuário.
                const tokensSnapshot = await userRef.collection("tokens").get();
                if (tokensSnapshot.empty) {
                    console.log(`Usuário ${userId} não tem tokens de notificação. Pulando.`);
                    return;
                }
                const tokens = tokensSnapshot.docs.map((tokenDoc) => tokenDoc.id);

                // Monta o payload da notificação.
                const payload = {
                    notification: {
                        title: "Lembrete de Memória Premium!",
                        body: `Sua memória "${postit.text.substring(0, 50)}..." vence hoje!`,
                        icon: "https://smemoria-bfaed.web.app/IMG/favicon.png",
                        click_action: "https://smemoria-bfaed.web.app" // URL para abrir ao clicar.
                    }
                };

                // Envia a notificação para todos os dispositivos (tokens) do usuário.
                await admin.messaging().sendToDevice(tokens, payload);
                console.log(`Notificação enviada para o usuário premium ${userId}.`);

                // Passo 4: Atualizações Atômicas no Banco de Dados
                // Usa um batch write para garantir que ambas as atualizações (contador e flag)
                // aconteçam juntas ou nenhuma aconteça.
                const batch = admin.firestore().batch();
                batch.update(userRef, { notificationCount: admin.firestore.FieldValue.increment(1) });
                batch.update(doc.ref, { notificationSent: true });
                return batch.commit();
            });

            // Aguarda o processamento de todos os lembretes.
            await Promise.all(promises);
            console.log("Processamento de lembretes concluído.");

        } catch (error) {
            console.error("Erro ao verificar lembretes:", error);
        }

        return null;
    });


// -----------------------------------------------------------------------------------
// Seção: Função Agendada - Reset do Contador de Notificações
// -----------------------------------------------------------------------------------

/**
 * @name resetNotificationCount
 * @type {functions.CloudFunction<functions.pubsub.Context>}
 * @description Uma Cloud Function agendada que reseta o `notificationCount` de todos
 * os usuários para 0. Essencial para o sistema de limite mensal.
 *
 * Gatilho: Pub/Sub (Agendamento)
 * Frequência: No primeiro dia de cada mês, à meia-noite.
 * Fuso Horário: 'America/Sao_Paulo'.
 */
exports.resetNotificationCount = functions.pubsub.schedule("1 of month 00:00")
    .timeZone("America/Sao_Paulo")
    .onRun(async (context) => {
        console.log("Iniciando a tarefa de resetar os contadores de notificação mensais.");

        try {
            // Query para encontrar todos os usuários que precisam ter o contador resetado.
            // A condição `where("notificationCount", ">", 0)` é uma otimização para
            // não tentar atualizar usuários que não usaram notificações.
            const querySnapshot = await admin.firestore().collection("users")
                .where("notificationCount", ">", 0)
                .get();

            if (querySnapshot.empty) {
                console.log("Nenhum usuário para resetar o contador. Finalizando a função.");
                return null;
            }

            console.log(`Resetando o contador para ${querySnapshot.size} usuário(s).`);

            // Um batch write é muito mais eficiente para múltiplas escritas, pois
            // reduz o número de operações faturadas e o tempo de execução.
            const batch = admin.firestore().batch();
            querySnapshot.forEach(doc => {
                batch.update(doc.ref, { notificationCount: 0 });
            });

            await batch.commit();
            console.log("Contadores de notificação resetados com sucesso.");

        } catch (error) {
            console.error("Erro ao resetar os contadores de notificação:", error);
        }

        return null;
    });
