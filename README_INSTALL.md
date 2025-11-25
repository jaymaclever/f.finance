# Guia de Instalação Automática (Proxmox/Linux)

Este guia instala o **Gestor Financeiro Familiar** e o configura como um serviço que inicia automaticamente no boot.

## Pré-requisitos
- Uma VM ou Container (LXC) no Proxmox rodando **Ubuntu 20.04+** ou **Debian 11+**.
- Acesso root ou sudo.

## Passo a Passo

1. **Acesse o terminal da VM**

2. **Baixe o código (Clone)**
   ```bash
   # Se estiver usando git
   git clone https://github.com/SEU_USUARIO/NOME_DO_REPO.git
   cd NOME_DO_REPO
   ```

3. **Execute o Instalador**
   ```bash
   chmod +x install.sh
   sudo ./install.sh
   ```

4. **Siga as instruções**
   - O script pedirá sua chave da API Gemini (Google AI).
   - Ele instalará o Node.js, Nginx e fará o build do projeto.

## O que acontece "Debaixo do Capô"?
- O script compila o React para HTML/CSS/JS estático na pasta `dist`.
- O **Nginx** é configurado para servir essa pasta.
- O comando `systemctl enable nginx` garante que o servidor web inicie sozinho se você reiniciar a VM.

## Manutenção

- **Atualizar a aplicação:**
  ```bash
  cd /var/www/gestor-financeiro
  git pull
  npm install
  npm run build
  sudo systemctl restart nginx
  ```

- **Ver logs de erro:**
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```
