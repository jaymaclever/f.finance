#!/bin/bash
set -e

echo "INICIANDO DEPLOY..."

# 1. Instalar dependencias
sudo apt update
sudo apt install -y git nginx curl

# Instalar Node 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 2. Variaveis
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 3. Build
npm install
npm run build

# 4. Configurar Diretorio
TARGET="/var/www/gestor-financeiro"
sudo mkdir -p $TARGET
sudo rm -rf $TARGET/dist
sudo cp -r dist $TARGET/

# 5. Configurar Nginx
NGINX_CONF="/etc/nginx/sites-available/gestor-financeiro"
sudo cp nginx.conf $NGINX_CONF

if [ ! -f "/etc/nginx/sites-enabled/gestor-financeiro" ]; then
    sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
fi

if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# 6. Permissoes
sudo chown -R www-data:www-data $TARGET
sudo chmod -R 755 $TARGET

if sudo ufw status | grep -q "active"; then
    sudo ufw allow 'Nginx Full'
fi

# 7. Reiniciar
sudo systemctl restart nginx

IP=$(hostname -I | awk '{print $1}')
echo "SUCESSO! Acesse: http://$IP"