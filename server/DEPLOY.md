# Guia Passo a Passo: Colocando o Sistema na Nuvem

Siga este guia para que o sistema funcione 24h por dia, sem precisar do seu computador ligado.

## Passo 1: Preparar o Banco de Dados (MongoDB)

1.  Acesse [mongodb.com/atlas/register](https://www.mongodb.com/cloud/atlas/register) e crie uma conta (é grátis).
2.  Crie um **Cluster** (escolha o plano **M0 Free**).
3.  Vá em **Security > Database Access** e crie um usuário (ex: `admin`) e uma senha. **Anote essa senha!**
4.  Vá em **Security > Network Access** e clique em "Add IP Address". Selecione **"Allow Access from Anywhere"** (`0.0.0.0/0`).
5.  Vá em **Database**, clique em **Connect**, escolha **Drivers** e copie a "Connection String".
    *   Vai parecer com isso: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
    *   Substitua `<password>` pela senha que você criou.

## Passo 2: Colocar o Código no GitHub

Para o Render acessar seu código, ele precisa estar no GitHub.

1.  Crie uma conta em [github.com](https://github.com).
2.  Crie um novo repositório chamado `checklist-server`.
3.  No seu computador, abra o terminal na pasta `server` (`D:\Check list\server`) e rode:
    ```bash
    git init
    git add .
    git commit -m "Configuração inicial"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/checklist-server.git
    git push -u origin main
    ```
    *(Troque SEU_USUARIO pelo seu nome de usuário do GitHub)*

## Passo 3: Criar o Servidor no Render

1.  Acesse [render.com](https://render.com) e crie uma conta (pode usar o login do GitHub).
2.  No painel (Dashboard), clique em **New +** e selecione **Blueprint**.
3.  Conecte sua conta do GitHub e selecione o repositório `checklist-server` que você criou.
4.  O Render vai detectar o arquivo `render.yaml` automaticamente.
5.  Ele vai pedir a **Environment Variable** chamada `MONGODB_URI`.
    *   Cole a Connection String que você copiou no Passo 1.
6.  Clique em **Apply** ou **Create Web Service**.
7.  Aguarde o deploy terminar. O Render vai te dar uma URL (ex: `https://checklist-server.onrender.com`).

## Passo 4: Migrar seus Dados (Opcional)

Se quiser enviar os dados que já estão no seu PC para a nuvem:

1.  No seu computador, abra o arquivo `D:\Check list\server\.env`.
2.  Adicione a linha: `MONGODB_URI=sua_connection_string_aqui`
3.  Abra o terminal na pasta `server` e rode:
    ```bash
    node migrate.js
    ```
4.  Pronto! Seus dados foram copiados para o MongoDB.

## Passo 5: Atualizar o Aplicativo

1.  No seu computador, vá na pasta `Checklist Mobile` e abra o arquivo `.env`.
2.  Mude o endereço para o do Render:
    ```env
    VITE_API_URL=https://checklist-server.onrender.com
    ```
3.  Gere um novo APK e instale nos celulares:
    ```bash
    npm run build
    npx cap sync
    cd android
    .\gradlew assembleDebug
    ```
4.  O arquivo APK estará em `android/app/build/outputs/apk/debug/app-debug.apk`.

---
**Parabéns!** Seu sistema agora é profissional e roda na nuvem.
