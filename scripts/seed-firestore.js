#!/usr/bin/env node

// Carrega o módulo de sistema de arquivos do Node.js para ler o arquivo de configuração.
const fs = require('fs');
// Carrega o módulo de caminho do Node.js para montar caminhos de arquivo de forma segura.
const path = require('path');
// Importa a função de inicialização do Firebase Admin SDK.
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
// Importa a função para acessar o Firestore via Admin SDK.
const { getFirestore } = require('firebase-admin/firestore');
// Importa biblioteca para gerar hash bcrypt da senha inicial do admin.
const bcrypt = require('bcryptjs');

// Função utilitária para ler JSON de arquivo local.
function readJson(filePath) {
  // Lê o conteúdo completo do arquivo como texto UTF-8.
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Converte o texto JSON em objeto JavaScript.
  return JSON.parse(raw);
}

// Função principal assíncrona que executa todo o seed.
async function main() {
  // Resolve a raiz do projeto subindo uma pasta a partir de scripts/.
  const repoRoot = path.resolve(__dirname, '..');
  // Monta caminho absoluto do arquivo de configuração do Firebase usado pelo projeto.
  const firebaseConfigPath = path.join(repoRoot, 'firebase-applet-config.json');

  // Lê configuração do app (projectId, firestoreDatabaseId etc.).
  const firebaseConfig = readJson(firebaseConfigPath);

  // Lê caminho opcional de Service Account por variável de ambiente.
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  // Declara variável para armazenar a instância inicializada do Firebase Admin.
  let app;

  // Se o usuário informou arquivo de Service Account, inicializa com credencial explícita.
  if (serviceAccountPath) {
    // Resolve caminho absoluto para evitar confusão de diretório de execução.
    const absServicePath = path.resolve(process.cwd(), serviceAccountPath);
    // Lê o JSON da service account informado.
    const serviceAccount = readJson(absServicePath);

    // Inicializa o app Firebase Admin com certificado da service account.
    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: cert(serviceAccount),
    });

    // Log informativo para mostrar o modo de autenticação em uso.
    console.log(`✅ Firebase Admin inicializado com Service Account: ${absServicePath}`);
  } else {
    // Inicializa usando credenciais padrão do ambiente (ADC), útil em Cloud Run/GCP local com gcloud auth.
    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: applicationDefault(),
    });

    // Log informativo para mostrar que está usando ADC.
    console.log('✅ Firebase Admin inicializado com Application Default Credentials (ADC).');
  }

  // Lê o ID do banco Firestore definido no config (ex: "(default)").
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  // Obtém cliente do Firestore apontando para o databaseId configurado.
  const db = getFirestore(app, databaseId === '(default)' ? undefined : databaseId);

  // Ajusta Firestore para ignorar campos undefined em operações de escrita.
  db.settings({ ignoreUndefinedProperties: true });

  // Define dados mínimos para documento global de estado da TV.
  const tvState = {
    status: 'idle',
    drawId: null,
    participantsNames: [],
    winners: [],
    timestamp: new Date().toISOString(),
  };

  // Define dados de grupo empresarial padrão (pode ser ajustado depois pelo painel).
  const defaultBusinessGroup = {
    name: process.env.SEED_GROUP_NAME || 'Grupo Padrão GBF',
    active: true,
    created_at: new Date().toISOString(),
  };

  // Cria referência de documento para groupId fixo, útil para ambientes novos e idempotentes.
  const businessGroupRef = db.collection('business_groups').doc('grupo_padrao');
  // Salva/atualiza grupo empresarial padrão sem apagar campos existentes.
  await businessGroupRef.set(defaultBusinessGroup, { merge: true });
  // Log de confirmação da operação.
  console.log('✅ Coleção business_groups seedada: doc grupo_padrao.');

  // Define dados de empresa padrão vinculada ao grupo criado acima.
  const defaultEmpresa = {
    name: process.env.SEED_EMPRESA_NAME || 'Empresa Padrão GBF',
    cnpj: process.env.SEED_EMPRESA_CNPJ || '',
    active: true,
    grupo_empresa_id: businessGroupRef.id,
  };

  // Cria referência da empresa padrão com ID fixo para facilitar integrações.
  const empresaRef = db.collection('empresas').doc('empresa_padrao');
  // Salva/atualiza empresa padrão de forma idempotente.
  await empresaRef.set(defaultEmpresa, { merge: true });
  // Log de confirmação.
  console.log('✅ Coleção empresas seedada: doc empresa_padrao.');

  // Lê variáveis para criação opcional do usuário admin inicial.
  const adminUsuario = process.env.SEED_ADMIN_USUARIO || '';
  const adminSenha = process.env.SEED_ADMIN_SENHA || '';
  const adminNome = process.env.SEED_ADMIN_NOME || 'Administrador do Sistema';

  // Se usuário e senha forem informados, cria/atualiza admin inicial.
  if (adminUsuario && adminSenha) {
    // Gera hash bcrypt seguro com 10 rounds para senha do admin.
    const senhaHash = await bcrypt.hash(adminSenha, 10);

    // Estrutura de dados esperada pelo seu backend para usuários internos.
    const adminPayload = {
      nome: adminNome,
      displayName: adminNome,
      usuario: adminUsuario,
      senha_hash: senhaHash,
      tipo: 'ADM',
      role: 'admin',
      empresa_id: empresaRef.id,
      grupo_empresa_id: businessGroupRef.id,
      ativo: true,
      active: true,
      tentativas_login: 0,
      bloqueado_ate: null,
      ultimo_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Procura se já existe usuário com o mesmo login para não duplicar admin.
    const existing = await db.collection('users').where('usuario', '==', adminUsuario).limit(1).get();

    // Se encontrou documento existente, atualiza mantendo o mesmo ID.
    if (!existing.empty) {
      // Pega primeiro documento encontrado.
      const existingDoc = existing.docs[0];
      // Atualiza admin existente sem remover campos antigos.
      await existingDoc.ref.set(adminPayload, { merge: true });
      // Log de atualização realizada.
      console.log(`✅ Usuário admin atualizado: users/${existingDoc.id}`);
    } else {
      // Caso não exista, cria novo documento na coleção users.
      const created = await db.collection('users').add(adminPayload);
      // Log de criação realizada.
      console.log(`✅ Usuário admin criado: users/${created.id}`);
    }
  } else {
    // Se não informou credenciais de admin, apenas avisa no console como proceder.
    console.log('⚠️ Admin inicial não foi criado. Defina SEED_ADMIN_USUARIO e SEED_ADMIN_SENHA para criar automaticamente.');
  }

  // Cria/atualiza documento settings/tv_state usado pela tela de TV do app.
  await db.collection('settings').doc('tv_state').set(tvState, { merge: true });
  // Log de confirmação do estado inicial da TV.
  console.log('✅ Documento settings/tv_state seedado.');

  // Cria um documento de exemplo em banks para facilitar o primeiro teste do sistema.
  await db.collection('banks').doc('banco_exemplo').set({
    name: 'Banco Exemplo',
    code: '000',
    pixKey: 'chave.exemplo@dominio.com',
    pixKeyType: 'EMAIL',
    active: true,
    empresa_id: empresaRef.id,
    grupo_empresa_id: businessGroupRef.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });
  // Log de confirmação do banco de exemplo.
  console.log('✅ Documento banks/banco_exemplo seedado.');

  // Mensagem final de sucesso do processo.
  console.log('🎉 Seed concluído com sucesso.');
}

// Executa função principal e trata sucesso/erro de forma padronizada.
main()
  // Se terminar sem erro, encerra com código 0 (sucesso).
  .then(() => process.exit(0))
  // Em caso de erro, imprime detalhes para depuração.
  .catch((error) => {
    // Log do erro completo.
    console.error('❌ Erro ao executar seed:', error);
    // Encerra processo com código 1 (falha).
    process.exit(1);
  });
