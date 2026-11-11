# As Crônicas do Reino Sombrio — Online (Pixel Art)

Protótipo multiplayer cooperativo para navegador, com visual pixel art e servidor Node.js + Socket.IO.

## Conteúdo desta versão
- Criar sala privada com código de 6 caracteres.
- Entrar na sala com nome de herói (até 8 jogadores).
- Lista em tempo real com nome, nível, vida, ataque, defesa, ouro e poções.
- Exploração da Floresta Sombria, Caverna dos Ecos e Castelo Sombrio.
- Busca por tesouros na floresta e nos escombros da caverna.
- Mercador com poções, espada de aço e armadura reforçada.
- Combate cooperativo com uma ação por jogador em cada rodada.
- Possibilidade de fugir dos combates comuns (não do chefe final).
- Evolução de nível, experiência, ouro e equipamentos.
- Mensagem de encerramento: “Um abraço do Beto San! Até a próxima aventura.”
- Interface e cenário em pixel art.

## Publicar no Render usando o GitHub
1. Extraia o ZIP no computador.
2. Entre no repositório que você já criou no GitHub.
3. Clique em **Add file > Upload files**.
4. Abra a pasta `reino_sombrio_online` que saiu do ZIP e envie o conteúdo dela para a raiz do repositório. O arquivo `server.js` e `package.json` devem ficar visíveis na primeira página do repositório; a pasta `public` também deve ficar na raiz.
5. Clique em **Commit changes** para salvar os arquivos no GitHub.
6. No Render, escolha **New + > Web Service** (não escolha Static Site).
7. Conecte sua conta GitHub e selecione o repositório do Reino Sombrio.
8. Preencha exatamente assim:
   - **Name:** `reino-sombrio-online`
   - **Runtime / Language:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health` (se o campo aparecer)
9. Escolha o plano disponível que preferir e clique em **Create Web Service**.
10. Quando aparecer **Live**, abra o endereço `https://...onrender.com` e compartilhe com os amigos.

O Render permite conectar um Web Service a um repositório GitHub e executar comandos de instalação e inicialização definidos para a aplicação. Depois, os pushes na branch conectada podem disparar novos deploys automaticamente.

## Rodar localmente (opcional)
1. Instale Node.js 20 ou superior: https://nodejs.org/
2. Abra um terminal dentro desta pasta.
3. Execute `npm install` e depois `npm start`.
4. Acesse http://localhost:3000.

## Limitações deste MVP
- As salas e o progresso ficam na memória do servidor; se o serviço reiniciar, as salas são apagadas.
- Ainda não há contas, senhas, banco de dados ou salvamento permanente.
- O protótipo adapta as principais mecânicas do BAT original, mas ainda não é uma conversão integral de todas as telas e eventos.
