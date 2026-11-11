const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, game: "Reino Sombrio Online" }));

const rooms = new Map();
const cleanName = s => String(s || "").replace(/[<>]/g, "").trim().slice(0, 18);
const code = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function makePlayer(id, name) {
  return { id, name, hp: 100, maxHp: 100, attack: 12, defense: 3, level: 1, xp: 0, gold: 20, potions: 3, weapon: "Espada enferrujada", ready: false };
}
function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map(p => ({ id:p.id, name:p.name, hp:p.hp, maxHp:p.maxHp, attack:p.attack, defense:p.defense, level:p.level, xp:p.xp, gold:p.gold, potions:p.potions, weapon:p.weapon, ready:p.ready })),
    world: room.world,
    battle: room.battle
  };
}
function emitRoom(room) { io.to(room.code).emit("state", publicRoom(room)); }
function message(room, text) { io.to(room.code).emit("notice", text); }
function addXp(p, amount) {
  p.xp += amount;
  while (p.xp >= 100) {
    p.xp -= 100; p.level++; p.maxHp += 15; p.hp = p.maxHp; p.attack += 3; p.defense += 1;
    messageForPlayer(p, `✨ ${p.name} chegou ao nível ${p.level}!`);
  }
}
function messageForPlayer(p, text) { io.to(p.id).emit("notice", text); }

io.on("connection", socket => {
  socket.on("createRoom", ({name}) => {
    name = cleanName(name) || "Aventureiro";
    let roomCode;
    do { roomCode = code(); } while (rooms.has(roomCode));
    const room = { code: roomCode, hostId: socket.id, players: new Map(), world: {forest:false, cave:false, castle:false}, battle:null };
    room.players.set(socket.id, makePlayer(socket.id, name));
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit("joined", {code:roomCode});
    emitRoom(room);
  });

  socket.on("joinRoom", ({name, roomCode}) => {
    name = cleanName(name) || "Aventureiro";
    roomCode = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return socket.emit("errorMessage", "Sala não encontrada. Confira o código.");
    if (room.players.size >= 8) return socket.emit("errorMessage", "A sala já está cheia (máximo de 8 jogadores).");
    if ([...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase()))
      return socket.emit("errorMessage", "Esse nome já está sendo usado nesta sala.");
    room.players.set(socket.id, makePlayer(socket.id, name));
    socket.join(roomCode);
    socket.emit("joined", {code:roomCode});
    message(room, `${name} entrou na aventura!`);
    emitRoom(room);
  });

  socket.on("ready", () => {
    const room = findRoom(socket.id); if (!room) return;
    const p = room.players.get(socket.id); p.ready = !p.ready;
    emitRoom(room);
  });

  socket.on("explore", ({area, action}) => {
    const room = findRoom(socket.id); if (!room) return;
    if (room.battle) return socket.emit("errorMessage", "Terminem o combate antes de explorar.");
    const p = room.players.get(socket.id);
    if (!['forest','cave','castle'].includes(area)) return;
    if (area === "cave" && !room.world.forest) return socket.emit("errorMessage", "Explore e conclua a Floresta Sombria primeiro.");
    if (area === "castle" && !room.world.cave) return socket.emit("errorMessage", "Conclua a Caverna dos Ecos antes de entrar no castelo.");
    if (area === "castle" && room.world.castle) return socket.emit("errorMessage", "O castelo já foi conquistado! O reino está livre.");

    if (action === "treasure") {
      if (area === "forest") {
        const roll = Math.floor(Math.random()*3);
        if (roll === 0) { p.gold += 15; message(room, `💰 ${p.name} encontrou 15 ouros na floresta!`); }
        else if (roll === 1) { p.potions += 1; message(room, `🧪 ${p.name} encontrou uma poção na floresta!`); }
        else {
          room.battle = { area, enemy:"Goblin ladrão", hp:45, maxHp:45, atk:11, xp:30, gold:16, boss:false, turn:0, acted:[] };
          message(room, `👹 Uma criatura surpreendeu ${p.name}! Goblin ladrão apareceu.`);
        }
      } else if (area === "cave") {
        if (Math.floor(Math.random()*2) === 0) { p.gold += 30; message(room, `💰 ${p.name} encontrou 30 ouros nos escombros!`); }
        else { p.potions += 2; message(room, `🧪 ${p.name} encontrou duas poções nos escombros!`); }
      }
      emitRoom(room); return;
    }
    if (action !== "enter") return;
    const pools = area === "forest"
      ? [{name:"Lobo sombrio",hp:35,atk:9,xp:25,gold:12},{name:"Goblin ladrão",hp:45,atk:11,xp:30,gold:16},{name:"Aranha gigante",hp:40,atk:12,xp:35,gold:18}]
      : [{name:"Orc guerreiro",hp:65,atk:15,xp:40,gold:25},{name:"Esqueleto amaldiçoado",hp:55,atk:17,xp:45,gold:28},{name:"Troll da caverna",hp:85,atk:13,xp:50,gold:35}];
    if (area === "castle") {
      room.battle = { area, enemy:"Senhor das Sombras", hp:180, maxHp:180, atk:20, xp:120, gold:150, boss:true, turn:0, acted:[] };
      message(room, "☠️ O Senhor das Sombras apareceu! Todos juntos!");
    } else {
      const enemy = pools[Math.floor(Math.random()*pools.length)];
      room.battle = { area, enemy:enemy.name, hp:enemy.hp, maxHp:enemy.hp, atk:enemy.atk, xp:enemy.xp, gold:enemy.gold, boss:false, turn:0, acted:[] };
      message(room, `⚔️ ${p.name} encontrou ${enemy.name}! A equipe pode atacar.`);
    }
    emitRoom(room);
  });

  socket.on("shop", ({item}) => {
    const room = findRoom(socket.id); if (!room) return;
    if (room.battle) return socket.emit("errorMessage", "Não dá para negociar durante um combate.");
    const p = room.players.get(socket.id);
    if (item === "potion") {
      if (p.gold < 10) return socket.emit("errorMessage", "Você precisa de 10 ouros para comprar uma poção.");
      p.gold -= 10; p.potions += 1; message(room, `🧪 ${p.name} comprou uma poção de vida.`);
    } else if (item === "sword") {
      if (p.gold < 40) return socket.emit("errorMessage", "Você precisa de 40 ouros para comprar a espada de aço.");
      if (p.attack >= 20) return socket.emit("errorMessage", "Você já possui uma arma deste nível ou superior.");
      p.gold -= 40; p.attack += 8; p.weapon = "Espada de aço"; message(room, `🗡️ ${p.name} comprou a Espada de aço!`);
    } else if (item === "armor") {
      if (p.gold < 35) return socket.emit("errorMessage", "Você precisa de 35 ouros para comprar a armadura reforçada.");
      if (p.defense >= 10) return socket.emit("errorMessage", "Sua armadura já está no nível máximo da loja.");
      p.gold -= 35; p.defense += 4; message(room, `🛡️ ${p.name} comprou a Armadura reforçada!`);
    }
    emitRoom(room);
  });

  socket.on("flee", () => {
    const room = findRoom(socket.id); if (!room || !room.battle) return;
    if (room.battle.boss) return socket.emit("errorMessage", "Não há como fugir da batalha final!");
    if (Math.floor(Math.random()*2) === 0) {
      const p = room.players.get(socket.id);
      message(room, `🏃 ${p.name} conseguiu fugir do combate. A criatura desapareceu e a equipe voltou à vila.`);
      room.battle = null; emitRoom(room);
    } else {
      const p = room.players.get(socket.id);
      const damage = Math.max(1, room.battle.atk - Math.floor(p.defense/2));
      p.hp = Math.max(0, p.hp - damage);
      message(room, `❌ ${p.name} não conseguiu fugir e recebeu ${damage} de dano.`);
      emitRoom(room);
    }
  });

  socket.on("battleAction", ({action}) => {
    const room = findRoom(socket.id); if (!room || !room.battle) return;
    const p = room.players.get(socket.id), b = room.battle;
    if (b.acted.includes(socket.id)) return socket.emit("errorMessage", "Você já agiu nesta rodada. Aguarde os outros jogadores.");
    if (action === "potion") {
      if (p.potions < 1) return socket.emit("errorMessage", "Você não tem poções.");
      if (p.hp === p.maxHp) return socket.emit("errorMessage", "Sua vida já está cheia.");
      p.potions--; p.hp = Math.min(p.maxHp, p.hp + 35);
      message(room, `🧪 ${p.name} usou uma poção.`);
    } else if (action === "attack") {
      const damage = Math.max(1, p.attack + Math.floor(Math.random()*7)-2);
      b.hp = Math.max(0, b.hp - damage);
      message(room, `⚔️ ${p.name} causou ${damage} de dano em ${b.enemy}!`);
    } else {
      return socket.emit("errorMessage", "Ação inválida.");
    }
    b.acted.push(socket.id);
    const living = [...room.players.values()].filter(x => x.hp > 0);
    if (b.hp <= 0) {
      const defeated = b;
      room.battle = null;
      for (const player of living) {
        player.gold += defeated.gold;
        addXp(player, defeated.xp);
      }
      if (defeated.area === "forest") room.world.forest = true;
      if (defeated.area === "cave") room.world.cave = true;
      if (defeated.boss) room.world.castle = true;
      message(room, defeated.boss
        ? "🏆 O Senhor das Sombras foi derrotado! O reino está livre! Um abraço do Beto San! Até a próxima aventura."
        : `🎉 ${defeated.enemy} derrotado! Todos os aventureiros vivos receberam ${defeated.xp} XP e ${defeated.gold} ouros.`);
      emitRoom(room); return;
    }
    if (b.acted.length >= living.length) {
      b.acted = [];
      b.turn++;
      for (const target of living) {
        const damage = Math.max(1, b.atk - Math.floor(target.defense/2) + Math.floor(Math.random()*5));
        target.hp = Math.max(0, target.hp - damage);
        messageForPlayer(target, `💥 ${b.enemy} atacou você e causou ${damage} de dano.`);
      }
      if (living.every(x => x.hp <= 0)) {
        room.battle = null;
        message(room, "💀 Todos caíram em combate. Voltem à vila e tentem novamente.");
      }
    }
    emitRoom(room);
  });

  socket.on("rest", () => {
    const room = findRoom(socket.id); if (!room) return;
    const p = room.players.get(socket.id);
    if (p.gold < 10) return socket.emit("errorMessage", "Você precisa de 10 ouros para descansar.");
    p.gold -= 10; p.hp = p.maxHp;
    socket.emit("notice", "Você descansou e recuperou toda a vida.");
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    const room = findRoom(socket.id); if (!room) return;
    const p = room.players.get(socket.id);
    room.players.delete(socket.id);
    if (p) message(room, `${p.name} saiu da sala.`);
    if (room.players.size === 0) rooms.delete(room.code);
    else {
      if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
      if (room.battle) room.battle.acted = room.battle.acted.filter(id => id !== socket.id);
      emitRoom(room);
    }
  });
});
function findRoom(id) { for (const room of rooms.values()) if (room.players.has(id)) return room; return null; }

server.listen(PORT, "0.0.0.0", () => console.log(`Reino Sombrio Online rodando na porta ${PORT}`));
