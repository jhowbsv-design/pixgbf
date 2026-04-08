# Seed de Firestore (Firebase) — GBF SmartPix

Este guia mostra **passo a passo** como usar o script `scripts/seed-firestore.js` para criar coleções/documentos iniciais automaticamente no Firebase.

## O que o script cria

O script prepara dados iniciais para:

- `business_groups/grupo_padrao`
- `empresas/empresa_padrao`
- `settings/tv_state`
- `banks/banco_exemplo`
- `users` (admin inicial **opcional**, se você informar variáveis de ambiente)

## Pré-requisitos

1. Ter Node.js instalado.
2. Estar na raiz do projeto.
3. Ter acesso ao projeto Firebase correto (`sistema-de-cad-e-cont-de-pix`).
4. Ter credenciais para Firebase Admin (uma destas opções):
   - **Opção A (recomendada local):** arquivo JSON de Service Account.
   - **Opção B:** ADC (Application Default Credentials) via `gcloud auth application-default login`.

## Passo a passo de uso

### 1) Entrar na raiz do projeto

```bash
cd /workspace/pixgbf
```

### 2) Instalar dependências (se ainda não instalou)

```bash
npm install
```

### 3) (Opcional, recomendado) definir Service Account

Baixe sua chave JSON da conta de serviço no Firebase/GCP e salve em local seguro.

Exemplo de export da variável:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH="./service-account.json"
```

> Se você não definir essa variável, o script tentará usar ADC automaticamente.

### 4) (Opcional) definir admin inicial

Se você quiser que o script já crie o admin interno:

```bash
export SEED_ADMIN_NOME="Administrador GBF"
export SEED_ADMIN_USUARIO="admin"
export SEED_ADMIN_SENHA="TroqueEssaSenhaAgora123!"
```

Também pode personalizar nome do grupo/empresa:

```bash
export SEED_GROUP_NAME="Grupo GBF"
export SEED_EMPRESA_NAME="GBF Matriz"
export SEED_EMPRESA_CNPJ="00.000.000/0001-00"
```

### 5) Executar o seed

```bash
node scripts/seed-firestore.js
```

### 6) Validar no Firebase Console

Confira no Firestore se os documentos foram criados/atualizados:

- `business_groups/grupo_padrao`
- `empresas/empresa_padrao`
- `settings/tv_state`
- `banks/banco_exemplo`
- `users/*` (se admin foi configurado)

## Reexecução segura (idempotência)

Você pode executar o script várias vezes.

- Documentos com ID fixo (`grupo_padrao`, `empresa_padrao`, `tv_state`, `banco_exemplo`) são atualizados com `merge: true`.
- Usuário admin é buscado por `usuario`; se existir, é atualizado.

## Segurança

- **Nunca** versionar `service-account.json` no Git.
- Troque a senha do admin regularmente.
- Use variáveis seguras no ambiente de produção.

## Solução de problemas

### Erro de permissão/autenticação

- Verifique `FIREBASE_SERVICE_ACCOUNT_PATH`.
- Verifique se a conta de serviço tem permissão no Firestore.
- Confirme se o `projectId` no `firebase-applet-config.json` está correto.

### Admin não criado

- Confirme se definiu `SEED_ADMIN_USUARIO` e `SEED_ADMIN_SENHA` antes de rodar.

