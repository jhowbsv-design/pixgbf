#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const firebaseConfigPath = path.join(repoRoot, 'firebase-applet-config.json');
  const firebaseConfig = readJson(firebaseConfigPath);
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let app;

  if (serviceAccountPath) {
    const absServicePath = path.resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = readJson(absServicePath);

    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: cert(serviceAccount),
    });

    console.log(`✅ Firebase Admin inicializado com Service Account: ${absServicePath}`);
  } else {
    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: applicationDefault(),
    });

    console.log('✅ Firebase Admin inicializado com Application Default Credentials (ADC).');
  }

  const databaseId = firebaseConfig.firestoreDatabaseId || 'default';
  const db = databaseId === 'default' || databaseId === '(default)'
    ? getFirestore(app)
    : getFirestore(app, databaseId);
  db.settings({ ignoreUndefinedProperties: true });

  const tvState = {
    status: 'idle',
    drawId: null,
    participantsNames: [],
    winners: [],
    timestamp: new Date().toISOString(),
  };

  const defaultBusinessGroup = {
    name: process.env.SEED_GROUP_NAME || 'Grupo Padrão GBF',
    active: true,
    created_at: new Date().toISOString(),
  };

  const businessGroupRef = db.collection('business_groups').doc('grupo_padrao');
  await businessGroupRef.set(defaultBusinessGroup, { merge: true });
  console.log('✅ Coleção business_groups seedada: doc grupo_padrao.');

  const defaultEmpresa = {
    name: process.env.SEED_EMPRESA_NAME || 'Empresa Padrão GBF',
    cnpj: process.env.SEED_EMPRESA_CNPJ || '',
    active: true,
    grupo_empresa_id: businessGroupRef.id,
  };

  const empresaRef = db.collection('empresas').doc('empresa_padrao');
  await empresaRef.set(defaultEmpresa, { merge: true });
  console.log('✅ Coleção empresas seedada: doc empresa_padrao.');

  const adminUsuario = process.env.SEED_ADMIN_USUARIO || '';
  const adminSenha = process.env.SEED_ADMIN_SENHA || '';
  const adminNome = process.env.SEED_ADMIN_NOME || 'Administrador do Sistema';

  if (adminUsuario && adminSenha) {
    const senhaHash = await bcrypt.hash(adminSenha, 10);

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

    const existing = await db.collection('users').where('usuario', '==', adminUsuario).limit(1).get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      await existingDoc.ref.set(adminPayload, { merge: true });
      console.log(`✅ Usuário admin atualizado: users/${existingDoc.id}`);
    } else {
      const created = await db.collection('users').add(adminPayload);
      console.log(`✅ Usuário admin criado: users/${created.id}`);
    }
  } else {
    console.log('⚠️ Admin inicial não foi criado. Defina SEED_ADMIN_USUARIO e SEED_ADMIN_SENHA para criar automaticamente.');
  }

  await db.collection('settings').doc('tv_state').set(tvState, { merge: true });
  console.log('✅ Documento settings/tv_state seedado.');

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
  console.log('✅ Documento banks/banco_exemplo seedado.');

  console.log('🎉 Seed concluído com sucesso.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  });
