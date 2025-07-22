// ===================================================================================
// Configuração e Inicialização do Firebase
// ===================================================================================
// Este arquivo é responsável por configurar e inicializar os serviços do Firebase
// que são usados em toda a aplicação. Ele também exporta as instâncias dos
// serviços para que possam ser facilmente importadas em outros módulos.
// ===================================================================================

/**
 * @const {object}
 * @description Contém as chaves e os identificadores necessários para conectar
 * a aplicação ao projeto Firebase correto na nuvem.
 *
 * IMPORTANTE:
 * Expor a `apiKey` e outros detalhes de configuração do cliente no lado do cliente
 * é uma prática segura e esperada pelo Firebase. A segurança é garantida
 * através das "Regras de Segurança" (Security Rules) configuradas no console do
 * Firebase para o Firestore, Storage e Realtime Database, e não pela ofuscação
 * dessas chaves. As regras definem quem pode ler, escrever, atualizar e
 * deletar dados.
 */
const firebaseConfig = {
    apiKey: "AIzaSyCAjJGwKaYi6cJNrmGcdnKgO-jHYGivv0E", authDomain: "smemoria-bfaed.firebaseapp.com",
    projectId: "smemoria-bfaed", storageBucket: "smemoria-bfaed.firebasestorage.app",
    messagingSenderId: "728874899156", appId: "1:728874899156:web:81744aa120a926ff5ccd41"
};

// Inicializa a aplicação Firebase com as configurações fornecidas.
// Este é o ponto de entrada para todos os serviços do Firebase.
firebase.initializeApp(firebaseConfig);

/**
 * @const {firebase.auth.Auth}
 * @description Exporta a instância do serviço de Autenticação do Firebase.
 * Usado para gerenciar o login, logout, registro e estado do usuário.
 */
const auth = firebase.auth();

/**
 * @const {firebase.firestore.Firestore}
 * @description Exporta a instância do serviço Cloud Firestore.
 * Usado como o banco de dados principal da aplicação para armazenar
 * notas, temas, configurações de usuário, etc.
 */
const db = firebase.firestore();

/**
 * Ativa a persistência de dados offline do Firestore.
 * Isso permite que a aplicação continue funcionando (lendo e escrevendo dados)
 * mesmo quando o usuário está sem conexão com a internet. As alterações são
 * salvas localmente e sincronizadas com o servidor assim que a conexão é
 * restabelecida.
 *
 * O bloco `.catch` trata de possíveis erros durante a ativação, como:
 * - 'failed-precondition': Ocorre se o usuário tiver várias abas abertas, pois a
 *   persistência só pode ser ativada em uma aba por vez.
 * - 'unimplemented': Ocorre se o navegador não suportar a funcionalidade.
 */
db.enablePersistence().catch(e => {
    console.warn("A persistência de dados offline do Firestore falhou:", e.code);
    if (e.code === 'failed-precondition') {
        console.warn("Isso geralmente ocorre por ter múltiplas abas da aplicação abertas. A persistência só pode ser ativada em uma aba.");
    } else if (e.code === 'unimplemented') {
        console.warn("O navegador atual não suporta a persistência offline.");
    }
});

// Mensagem de log para confirmar que o Firebase foi inicializado corretamente.
// Útil para depuração durante o desenvolvimento.
console.log("Firebase inicializado e configurado.");
