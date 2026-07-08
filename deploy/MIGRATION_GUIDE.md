# Guia passo-a-passo — migração para VPS

## 0. Pré-requisitos na VPS

Ubuntu 22.04+ (ou Debian 12). Como root:

```bash
apt update && apt -y upgrade
apt -y install ca-certificates curl gnupg ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update && apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
ufw allow 22,80,443/tcp && ufw --force enable
```

Crie um usuário dedicado:

```bash
adduser app && usermod -aG docker app
```

## 1. Clonar o projeto

```bash
sudo -iu app
git clone <seu-repo> /opt/app
cd /opt/app/deploy
cp .env.example .env
nano .env   # preencha domínio, senha do Postgres, JWT_SECRET etc.
```

Gere segredos fortes:
```bash
openssl rand -hex 48    # JWT_SECRET
openssl rand -hex 48    # SESSION_SECRET
openssl rand -base64 32 # POSTGRES_PASSWORD
```

## 2. DNS + firewall

- Aponte o A record de `app.seudominio.com.br` para o IP da VPS.
- Aguarde propagação (`dig +short app.seudominio.com.br` deve retornar seu IP).

## 3. Exportar dados atuais (roda na sua máquina local)

```bash
export PGURI="postgres://... (peça no Lovable → Cloud → Export)"
./scripts/export-from-cloud.sh
scp dumps/public-*.sql app@vps:/opt/app/deploy/init-db/10-data.sql
scp scripts/transform-schema.sql app@vps:/opt/app/deploy/init-db/20-transform.sql
```

Nota: colocando os `.sql` em `init-db/`, o Postgres executa **na primeira subida** (volume vazio) em ordem alfabética: `00-extensions.sql` → `10-data.sql` → `20-transform.sql`. Se o volume já existe você precisa aplicar manualmente.

## 4. Subir o stack

```bash
cd /opt/app/deploy
docker compose up -d --build
docker compose logs -f app
```

## 5. Emitir certificado TLS

Antes do certbot, o nginx precisa responder em :80. Como o `nginx.conf` referencia certificados que ainda não existem, faça a primeira emissão em duas etapas:

```bash
# 5a) Sobe nginx em modo temporário (só HTTP)
sed -i 's|APP_DOMAIN_PLACEHOLDER|'"$APP_DOMAIN"'|g' nginx.conf
docker compose up -d nginx
# 5b) Emite certificado
docker compose run --rm certbot
# 5c) Reload nginx com HTTPS ativo
docker compose exec nginx nginx -s reload
```

Renovação automática (cron da VPS):
```
0 4 * * * cd /opt/app/deploy && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

## 6. Criar primeiro admin

```bash
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB <<'SQL'
INSERT INTO app_users (email, password_hash, full_name, email_verified_at)
VALUES (
  'admin@seudominio.com.br',
  crypt('senha-inicial-forte', gen_salt('bf', 12)),
  'Administrador',
  now()
) RETURNING id;
SQL
```

Copie o UUID retornado e conceda role de sede:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin_sede');
```

## 7. Backups

```bash
sudo mkdir -p /var/log && sudo touch /var/log/app-backup.log && sudo chown app: /var/log/app-backup.log
crontab -e
# adiciona:
0 3 * * * /opt/app/deploy/scripts/backup.sh >> /var/log/app-backup.log 2>&1
```

## 8. Observabilidade mínima

```bash
docker compose logs --tail=200 -f app
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM app_users;"
```

Para métricas mais sérias, adicione um serviço `grafana + prometheus + postgres_exporter` no compose depois.
