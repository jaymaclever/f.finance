# Guia de Instalação Automática (Ubuntu Server)

Este guia instala o **Gestor Financeiro Familiar** em um servidor **Ubuntu 20.04/22.04/24.04** (físico, VM Proxmox ou VPS).

## Instalação em 1 Passo

Se você já clonou este repositório na sua máquina virtual, execute:

```bash
sudo bash deploy.sh
```

---

## Instalação do Zero (Do GitHub para VM)

Se sua VM está vazia, siga estes 3 comandos:

1. **Atualize e instale o Git:**
   ```bash
   sudo apt update && sudo apt install -y git
   ```

2. **Clone o Repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/gestor-financeiro.git
   cd gestor-financeiro
   ```

3. **Execute o Instalador Automático:**
   ```bash
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

## O que o script faz?

1. **Sistema:** Atualiza o Ubuntu e configura o Firewall (UFW) para permitir tráfego Web.
2. **Ambiente:** Instala **Node.js v20** e **Nginx**.
3. **App:** 
   - Move os arquivos para `/var/www/gestor-financeiro`.
   - Pede sua **Chave da API Gemini** e salva no sistema.
   - Instala as dependências e faz o "Build" (otimização) do site.
4. **Servidor Web:** Configura o Nginx para servir o aplicativo e iniciar automaticamente se o servidor reiniciar.

## Pós-Instalação

- Acesse o aplicativo digitando o IP do servidor no navegador.
- O sistema inicia automaticamente no boot.

**Para atualizar para uma nova versão do código:**
Execute novamente o comando `sudo ./deploy.sh` dentro da pasta.
