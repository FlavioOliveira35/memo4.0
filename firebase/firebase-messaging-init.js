// ===================================================================================
// Inicialização do Firebase Cloud Messaging (FCM)
// ===================================================================================
// Este script é responsável por toda a lógica do lado do cliente para configurar
// as notificações push. Suas principais responsabilidades são:
// 1. Solicitar permissão do usuário para enviar notificações.
// 2. Obter o token de registro exclusivo do dispositivo/navegador.
// 3. Salvar esse token no Firestore, associado ao usuário logado.
// 4. Lidar com a atualização de tokens.
// ===================================================================================

// O listener 'load' garante que o script só execute após o carregamento completo
// da página, incluindo o SDK do Firebase.
window.addEventListener('load', () => {
    // Verifica se o navegador possui as APIs necessárias para Service Workers e Notificações.
    if ('serviceWorker' in navigator && 'Notification' in window) {

        // Inicializa as instâncias dos serviços Firebase necessários.
        const messaging = firebase.messaging();
        const db = firebase.firestore();

        /**
         * @function requestPermissionAndGetToken
         * @description Orquestra o fluxo de pedir permissão e, se concedida, obter e salvar o token.
         */
        function requestPermissionAndGetToken() {
            console.log('FCM: Solicitando permissão para notificações...');

            // A API de Notificações é assíncrona e baseada em Promises.
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    console.log('FCM: Permissão concedida. Obtendo token...');

                    // `getToken` contata os servidores do Google para obter um token de registro único.
                    // A `vapidKey` (Voluntary Application Server Identification) é uma chave pública
                    // que prova que as notificações são enviadas do seu servidor de aplicação.
                    //
                    // !!! NOTA DE SEGURANÇA IMPORTANTE !!!
                    // A VAPID key abaixo parece ser um placeholder. Para que o FCM funcione,
                    // você DEVE substituí-la pela chave pública gerada no seu console do Firebase,
                    // em Configurações do Projeto > Cloud Messaging > Certificados de push da Web.
                    messaging.getToken({ vapidKey: "BAlb_VfIe_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw" })
                        .then((currentToken) => {
                            if (currentToken) {
                                console.log('FCM: Token obtido:', currentToken);
                                // Após obter o token, ele precisa ser salvo no backend.
                                saveToken(currentToken);
                            } else {
                                // Isso pode acontecer se a permissão for revogada entre a concessão e a obtenção do token.
                                console.log('FCM: Não foi possível obter o token de registro. O usuário pode ter revogado a permissão ou não há um service worker registrado.');
                            }
                        }).catch((err) => {
                            console.error('FCM: Erro ao obter o token:', err);
                        });
                } else {
                    console.log('FCM: Permissão para notificações não foi concedida.');
                }
            });
        }

        /**
         * @function saveToken
         * @description Salva o token de notificação do dispositivo no Firestore.
         * @param {string} token - O token de registro do FCM a ser salvo.
         */
        function saveToken(token) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                // A estrutura 'users/{userId}/tokens/{token}' é uma boa prática:
                // - Organiza os tokens por usuário.
                // - Usar o próprio token como ID do documento previne a inserção de duplicatas
                //   de forma natural e eficiente.
                db.collection('users').doc(currentUser.uid).collection('tokens').doc(token).set({
                    token: token, // O token é salvo também como um campo para facilitar queries.
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() // Útil para limpar tokens antigos.
                }).then(() => {
                    console.log('FCM: Token salvo no Firestore.');
                }).catch((err) => {
                    console.error('FCM: Erro ao salvar o token no Firestore:', err);
                });
            } else {
                // O token só é útil se associado a um usuário.
                console.log('FCM: Usuário não está logado. O token não será salvo.');
            }
        }

        // Observador que dispara quando o estado de autenticação do usuário muda.
        // Garante que a lógica de notificação só execute para usuários logados.
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Usuário está logado. É seguro pedir permissão e salvar o token.
                requestPermissionAndGetToken();
            } else {
                // Usuário está deslogado.
                console.log('FCM: Usuário deslogado. A inicialização do FCM será adiada até o login.');
                // NOTA: Uma lógica para remover o token do Firestore no logout poderia ser
                // implementada aqui, mas geralmente não é necessário, pois tokens inválidos
                // são tratados pelo backend ao enviar notificações.
            }
        });

        // Manipulador para o evento `onTokenRefresh`.
        // O FCM pode, raramente, gerar um novo token para um dispositivo (ex: se o usuário
        // limpar os dados do site). Este listener garante que o novo token seja
        // salvo no backend, substituindo o antigo.
        messaging.onTokenRefresh(() => {
            messaging.getToken({ vapidKey: "BAlb_VfIe_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw_e_f0j6n_K9yX_Hw" }) // Substitua pela sua VAPID key
                .then((refreshedToken) => {
                    console.log('FCM: Token foi atualizado.');
                    saveToken(refreshedToken);
                }).catch((err) => {
                    console.log('FCM: Não foi possível obter o token atualizado.', err);
                });
        });

    } else {
        console.log('FCM: Service workers ou a API de Notificações não são suportados neste navegador.');
    }
});
