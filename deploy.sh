#!/bin/bash

# Script de Deploy Automatizado
# Compatível com Ubuntu 20.04+

set -e

echo "🚀 INICIANDO DEPLOY..."

# 1. Instalar Dependências
sudo apt update
sudo apt install -y git nginx curl

# Instalar Node.js v20
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 2. Carregar Variáveis (Opcional)
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 3. Build
echo "🔨 Compilando..."
npm install
npm run build

# 4. Configurar Diretório Web
TARGET_DIR="/var/www/gestor-financeiro"
sudo mkdir -p $TARGET_DIR
sudo rm -rf $TARGET_DIR/dist
sudo cp -r dist $TARGET_DIR/

# 5. Configurar Nginx
echo "🌐 Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/gestor-financeiro

# Link Simbólico
if [ ! -f "/etc/nginx/sites-enabled/gestor-financeiro" ]; then
    sudo ln -s /etc/nginx/sites-available/gestor-financeiro /etc/nginx/sites-enabled/
fi

# Remover default
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# 6. Permissões
sudo chown -R www-data:www-data $TARGET_DIR
sudo chmod -R 755 $TARGET_DIR

# 7. Reiniciar
sudo systemctl restart nginx

IP_ADDR=$(hostname -I | awk '{print $1}')
echo "✅ SUCESSO! Acesse: http://$IP_ADDR"