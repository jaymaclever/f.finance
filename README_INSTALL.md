# Instalação do Gestor Financeiro (Linux/Proxmox)

## Pré-requisitos
- Uma máquina virtual (VM) ou servidor rodando **Ubuntu 20.04, 22.04 ou 24.04**.
- Acesso à internet na VM.
- Uma chave de API do Google Gemini (Grátis em aistudio.google.com).

## Passo a Passo

### 1. Coloque os arquivos na VM
Se você estiver usando Git:
```bash
git clone https://github.com/SEU_USUARIO/gestor-financeiro.git
cd gestor-financeiro
```
Ou se copiou os arquivos manualmente, navegue até a pasta onde eles estão.

### 2. Dê permissão de execução
```bash
chmod +x deploy.sh
```

### 3. Execute a instalação
```bash
sudo ./deploy.sh
```

O script fará todo o trabalho automaticamente:
- Instalará Node.js e Nginx.
- Compilará o site.
- Configurará o servidor web.

### 4. Acesse
Abra o navegador e digite o IP que aparecerá no final da instalação (ex: `http://192.168.1.50`).

---

## Configuração Pós-Instalação (Obrigatório para IA)

O aplicativo iniciará sem a inteligência artificial ativada. Para ativar:

1.  Faça login com **Usuário:** `admin` e **Senha:** `admin`.
2.  No menu lateral, vá em **Configurações**.
3.  Abra a seção **Integrações & IA**.
4.  Cole sua **Google Gemini API Key** e salve.

---

## Solução de Problemas

**Erro: Permissão negada**
Certifique-se de rodar com `sudo`.

**Atualizar a aplicação**
Se você mudar o código, basta rodar `sudo ./deploy.sh` novamente na pasta. Ele vai reconstruir e atualizar o site sem perder as configurações do servidor.