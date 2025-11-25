# Gestor Financeiro Familiar V2 🚀

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini%20AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

Uma aplicação web completa, moderna e inteligente para gestão financeira pessoal e familiar. Desenvolvida com foco na realidade econômica (Multimoedas, Inflação, Câmbio) e potencializada por Inteligência Artificial.

## ✨ Principais Funcionalidades

### 🤖 Inteligência Artificial (Gemini)
- **Input Inteligente**: Adicione transações falando ou digitando naturalmente (ex: "Gastei 15.000 no mercado ontem").
- **Categorização Automática**: A IA define a categoria correta para seus gastos.
- **Consultor Financeiro (Chat)**: Tire dúvidas sobre suas finanças com um assistente contextual.
- **Análise Comportamental**: Descubra sua "Persona Financeira" e receba dicas personalizadas baseadas nos seus padrões.
- **Leitura de Documentos**: Upload de PDFs bancários para extração automática de dados de empréstimos.

### 👨‍👩‍👧‍👦 Modo Família & Privacidade
- **Gestão Hierárquica**: Super Admin > Admin > Gestor Familiar > Membro.
- **Isolamento**: Famílias não veem dados umas das outras.
- **Privacidade**: Filhos maiores de 18 anos podem ocultar detalhes financeiros dos pais.
- **Tarefas & Eventos**: Calendário e lista de tarefas compartilhados por família.

### 💰 Gestão Financeira Avançada
- **Dashboard Interativo**: Gráficos de fluxo de caixa, por categoria e **Score de Saúde Financeira**.
- **Metas Inteligentes**: Acompanhe o progresso de sonhos (Casa, Carro) com projeção de juros.
- **Orçamentos**: Defina tetos de gastos com alertas automáticos.
- **Assinaturas**: Gestão separada de gastos recorrentes e fixos.

### 📈 Economia Real (Angola/Global)
- **Multimoedas**: Suporte a Kwanza (AOA), Dólar (USD), Euro, Real, Libra, Yuan, Rand e Iene.
- **Controle de Inflação**: Calculadora de poder de compra e histórico de inflação.
- **Câmbio Realista**: Escolha entre taxas do **BNA (Oficial)**, **Forex** ou **Mercado Paralelo (Rua)**.

### 🛠️ Administração & Segurança
- **Login Seguro**: Recuperação de senha com perguntas de segurança.
- **Backup & Restore**: Exporte e importe todos os dados em JSON.
- **Temas**: Modo Claro e Escuro (Dark Mode) nativos.

---

## 🚀 Instalação Automática (Proxmox / Linux VM)

Instale o sistema completo (App + Servidor Web Nginx) com **um único comando** em sua VM Ubuntu ou Debian.

1. Acesse o terminal da sua VM (via SSH ou Console do Proxmox).
2. Execute:

```bash
chmod +x setup.sh && sudo ./setup.sh
```

*Nota: O script solicitará sua chave da API do Google Gemini durante a instalação.*

O sistema estará acessível em `http://IP-DA-SUA-VM` e iniciará automaticamente no boot.

---

## 💻 Instalação Manual (Desenvolvimento)

Para rodar localmente em sua máquina:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/gestor-financeiro.git
   cd gestor-financeiro
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure a API Key:**
   Crie um arquivo `.env` na raiz:
   ```env
   API_KEY=sua_chave_gemini_aqui
   ```

4. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

---

## 🔑 Acesso Inicial

Após a instalação, utilize as credenciais padrão do **Super Admin**:

- **Usuário:** `admin`
- **Senha:** `admin`

*Recomendamos alterar a senha imediatamente no menu "Configurações > Segurança".*

---

## 📄 Licença

Este projeto é de código aberto. Sinta-se livre para contribuir!
