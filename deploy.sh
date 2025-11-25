#!/bin/bash

# Script de Deploy Automatizado para Gestor Financeiro Familiar
# Compatível com Ubuntu 20.04, 22.04, 24.04 (LTS)

# Parar a execução imediatamente se ocorrer um erro
set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}🚀 INICIANDO DEPLOY: GESTOR FINANCEIRO FAMILIAR${NC}"
echo -e "${GREEN}==================================================${NC}"

# 1. VERIFICAÇÃO E INSTALAÇÃO DE DEPENDÊNCIAS
echo -e "${YELLOW}📦 [1/6] Verificando dependências do sistema...${NC}"

# Atualizar repositórios
sudo apt update

# Instalar Git, Curl e Nginx se não existirem
echo "   - Instalando Git, Curl e Nginx..."
sudo apt install -y git nginx curl

# Verificar se o Node.js está instalado e se é a versão correta (v20+)
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    echo -e "${YELLOW}   - Node.js não encontrado ou versão antiga. Instalando Node.js v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "   - Node.js já instalado: $(node -v)"
fi

echo -e "${GREEN}✅ Dependências instaladas.${NC}"

# 2. PREPARAÇÃO DO AMBIENTE (API KEY)
if [ -f ".env" ]; then
    echo "ℹ️  Arquivo .env encontrado. Usando variáveis locais."
    export $(grep -v '^#' .env | xargs)
fi

# 3. ATUALIZAÇÃO DO CÓDIGO (GIT PULL)
# Verifica se estamos num repositório git e tenta atualizar
if [ -d ".git" ]; then
    echo -e "${YELLOW}🔄 [2/6] Repositório detectado. Buscando atualizações...${NC}"
    # Salvar mudanças locais se houver (stash), puxar e reaplicar stash
    git stash
    git pull origin main || echo -e "${YELLOW}⚠️  Aviso: Não foi possível fazer git pull. Usando código local.${NC}"
    git stash pop || true
else
    echo "ℹ️  Não é um repositório Git ou clone inicial. Pulando atualização automática."
fi

# 4. BUILD DA APLICAÇÃO
echo -e "${YELLOW}🔨 [3/6] Compilando aplicação...${NC}"

# Instalar dependências do projeto
echo "   - Instalando pacotes NPM..."
npm install

# Gerar build de produção (Vite -> pasta dist/)
echo "   - Gerando build de produção..."
npm run build

echo -e "${GREEN}✅ Build concluído com sucesso.${NC}"

# 5. DEPLOY NO SERVIDOR WEB
TARGET_DIR="/var/www/gestor-financeiro"
echo -e "${YELLOW}📂 [4/6] Configurando diretório web: $TARGET_DIR${NC}"

# Criar diretório se não existir
if [ ! -d "$TARGET_DIR" ]; then
    sudo mkdir -p $TARGET_DIR
fi

# Limpar instalação anterior (mas mantém a pasta para permissões)
sudo rm -rf $TARGET_DIR/dist

# Copiar nova versão para a pasta do servidor
echo "   - Copiando arquivos..."
sudo cp -r dist $TARGET_DIR/

echo -e "${GREEN}✅ Arquivos movidos.${NC}"

# 6. CONFIGURAÇÃO DO NGINX
echo -e "${YELLOW}🌐 [5/6] Configurando Nginx...${NC}"
NGINX_CONF_SRC="nginx.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/gestor-financeiro"

# Verificar se o arquivo nginx.conf existe no diretório atual
if [ -f "$NGINX_CONF_SRC" ]; then
    sudo cp $NGINX_CONF_SRC $NGINX_CONF_DEST
else
    echo -e "${RED}❌ ERRO CRÍTICO: Arquivo nginx.conf não encontrado na pasta atual.${NC}"
    exit 1
fi

# Criar link simbólico (ativar site) se não existir
if [ ! -f "/etc/nginx/sites-enabled/gestor-financeiro" ]; then
    echo "   - Ativando site no Nginx..."
    sudo ln -s $NGINX_CONF_DEST /etc/nginx/sites-enabled/
fi

# Remover site padrão do Nginx para evitar conflitos na porta 80
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "   - Removendo site padrão do Nginx..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Testar configuração
echo "   - Testando configuração do Nginx..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configurado corretamente.${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx.${NC}"
    exit 1
fi

# 7. PERMISSÕES E FIREWALL
echo -e "${YELLOW}🔒 [6/6] Ajustando segurança...${NC}"

# Dar propriedade ao usuário do Nginx (www-data)
sudo chown -R www-data:www-data $TARGET_DIR
# Permissões de leitura/execução para diretórios e leitura para arquivos
sudo chmod -R 755 $TARGET_DIR

# Liberar portas Web no Firewall (UFW) se estiver ativo
if sudo ufw status | grep -q "Status: active"; then
    echo "   - Configurando UFW..."
    sudo ufw allow 'Nginx Full'
fi

echo -e "${GREEN}✅ Segurança ajustada.${NC}"

# 8. FINALIZAÇÃO
echo -e "${YELLOW}🔄 Reiniciando serviços...${NC}"
sudo systemctl restart nginx

# Obter IP da máquina
IP_ADDR=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}🎉 ATUALIZAÇÃO/DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo ""
echo -e "👉 Acesse sua aplicação em: ${YELLOW}http://$IP_ADDR${NC}"
echo ""
echo -e "${YELLOW}⚠️  LEMBRETE:${NC} Se você mudou configurações de API Key, verifique no painel Admin."
echo -e "${GREEN}==================================================${NC}"