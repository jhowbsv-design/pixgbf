# Configuração PostgreSQL + WireGuard + MikroTik - PIXGBFE

## Objetivo
Documentar toda a configuração realizada para permitir acesso seguro ao PostgreSQL do projeto PIXGBFE utilizando WireGuard no MikroTik sem expor o banco diretamente na internet.

---

# Cenário da infraestrutura

## Servidor PostgreSQL

- Sistema operacional: Windows Server 2019 Datacenter
- PostgreSQL configurado para porta: 5433
- IP interno do servidor:

```text
192.168.1.34
```

---

## WireGuard

### Rede VPN

```text
10.12.1.0/24
```

### IP do cliente VPN

```text
10.12.1.1
```

### AllowedIPs

```text
192.168.1.0/24
```

---

# Problemas encontrados

## 1. Tentativa de acesso usando IP incorreto

Inicialmente foi utilizado:

```powershell
Test-NetConnection 192.168.0.10 -Port 5433
```

Problema:
- o servidor não estava na rede 192.168.0.x
- IP correto era 192.168.1.34

Correção:

```powershell
Test-NetConnection 192.168.1.34 -Port 5433
```

---

## 2. PostgreSQL não acessível externamente

Mesmo com VPN conectada:

```text
TcpTestSucceeded : False
```

Causas verificadas:
- firewall Windows
- PostgreSQL ainda não confirmado na porta 5433

---

# Configuração do PostgreSQL

## Arquivo postgresql.conf

Localizado através do comando:

```sql
SHOW config_file;
```

Linhas alteradas:

```conf
listen_addresses = '*'
port = 5433
```

---

## Arquivo pg_hba.conf

Localizado através do comando:

```sql
SHOW hba_file;
```

Linha adicionada:

```conf
host    all    all    10.12.1.0/24    scram-sha-256
```

Objetivo:
- permitir acesso apenas pela rede VPN WireGuard

---

# Reinício do PostgreSQL

Executado:

```powershell
Restart-Service postgresql*
```

---

# Verificações realizadas

## Verificar se PostgreSQL abriu corretamente

```powershell
netstat -ano | findstr 5433
```

Resultado esperado:

```text
TCP    0.0.0.0:5433    LISTENING
```

Resultado obtido:

```text
TCP    0.0.0.0:5433           0.0.0.0:0              LISTENING
TCP    [::]:5433              [::]:0                 LISTENING
```

Confirmando:
- PostgreSQL ouvindo corretamente
- porta liberada no serviço

---

# Configuração Firewall Windows

Problema identificado:
- firewall bloqueando TCP 5433

Correção aplicada:

```powershell
New-NetFirewallRule -DisplayName "PostgreSQL 5433 WireGuard" -Direction Inbound -Protocol TCP -LocalPort 5433 -RemoteAddress 10.12.1.0/24 -Action Allow
```

Objetivo:
- liberar acesso apenas para rede VPN

---

# Testes realizados

## Teste Ping

```powershell
ping 192.168.1.34
```

Resultado:

```text
Resposta de 192.168.1.34
```

Confirmando:
- VPN funcionando
- roteamento correto
- comunicação com servidor

---

## Teste TCP PostgreSQL

```powershell
Test-NetConnection 192.168.1.34 -Port 5433
```

Resultado final:

```text
TcpTestSucceeded : True
```

Confirmando:
- PostgreSQL acessível pela VPN
- firewall correto
- serviço funcionando

---

# Segurança aplicada

## Estratégia adotada

O PostgreSQL NÃO foi exposto diretamente na internet.

Acesso permitido somente via:

- WireGuard
- rede privada VPN
- firewall restritivo

---

# Medidas de segurança recomendadas

## Recomendadas para PIXGBFE

- NÃO abrir NAT da porta 5433
- NÃO expor PostgreSQL na internet
- utilizar somente WireGuard
- usar usuários específicos da aplicação
- evitar uso do usuário postgres
- utilizar senhas fortes
- realizar backups automáticos
- manter PostgreSQL atualizado
- monitorar logs de acesso

---

# Exemplo de conexão Node.js

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: '192.168.1.34',
  port: 5433,
  user: 'usuario',
  password: 'senha_forte',
  database: 'pixgbfe'
});
```

---

# Exemplo .env

```env
DB_HOST=192.168.1.34
DB_PORT=5433
DB_NAME=pixgbfe
DB_USER=usuario
DB_PASSWORD=senha_forte
```

---

# Status final

## Ambiente validado

- WireGuard funcionando
- PostgreSQL acessível remotamente
- Firewall configurado
- Comunicação VPN validada
- Banco protegido contra exposição pública

---

# Resultado final

Infraestrutura do PIXGBFE operando com:

- VPN segura
- PostgreSQL protegido
- comunicação criptografada
- acesso remoto funcional
- sem exposição direta na internet
