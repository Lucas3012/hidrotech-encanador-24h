/* =========================================================
   HidroTech — Atendimento no site (bot de chat)
   O botão verde flutuante abre o atendimento aqui no site.
   ========================================================= */

(function () {
  "use strict";

  var PHONE_DISPLAY = "(73) 98107-0937";
  var PHONE_RAW = "5573981070937";

  var toggle = document.getElementById("chatToggle");
  var panel = document.getElementById("chatPanel");
  var closeBtn = document.getElementById("chatClose");
  var msgs = document.getElementById("chatMsgs");
  var quick = document.getElementById("chatQuick");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatInput");
  var attachBtn = document.getElementById("chatAttach");
  var fileInput = document.getElementById("chatFile");
  var badge = document.getElementById("chatBadge");

  if (!toggle || !panel || !msgs) return;

  /* ---------- estado ---------- */
  var started = false;
  var busy = false;
  var step = "menu"; // menu | descricao | urgencia | nome | endereco | telefone | fim
  var queue = [];
  var data = {
    servico: "",
    urgencia: "",
    descricao: "",
    anexo: null, // { file, tipo, url }
    nome: "",
    endereco: "",
    telefone: "",
    protocolo: ""
  };

  var MAX_ANEXO = 25 * 1024 * 1024; // 25 MB

  var SERVICES = {
    vazamento: {
      label: "Vazamento / cano furado",
      text: "Vazamento não espera. A gente fecha o registro, localiza o ponto e resolve sem quebrar parede à toa."
    },
    desentupimento: {
      label: "Desentupimento",
      text: "Trabalhamos com hidrojateamento e equipamento profissional — esgoto, ralo, vaso e caixa de gordura."
    },
    bomba: {
      label: "Bomba d'água / pressão",
      text: "Diagnóstico, troca de bomba e ajuste de pressão, com teste na sua frente."
    },
    aquecedor: {
      label: "Aquecedor / chuveiro",
      text: "Instalação, troca e manutenção de aquecedores, com teste de estanqueidade."
    },
    reforma: {
      label: "Reforma de banheiro",
      text: "Troca de louças, metais e tubulações com acabamento caprichado e orçamento em 24h."
    }
  };

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function scrollDown() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function bubble(html, kind) {
    var el = document.createElement("div");
    el.className = "msg msg--" + (kind || "bot");
    el.innerHTML = html;
    msgs.appendChild(el);
    scrollDown();
    return el;
  }

  function clearQuick() {
    quick.innerHTML = "";
  }

  function setQuick(options) {
    clearQuick();
    (options || []).forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip-btn" + (opt.cls ? " " + opt.cls : "");
      b.textContent = opt.label;
      b.addEventListener("click", function () {
        clearQuick();
        bubble(esc(opt.label), "user");
        opt.action();
      });
      quick.appendChild(b);
    });
  }

  /* fila de mensagens do bot (com indicador "digitando") */
  function say(html, opts) {
    opts = opts || {};
    queue.push({ html: html, opts: opts });
    if (!busy) drain();
  }

  function drain() {
    var item = queue.shift();
    if (!item) {
      busy = false;
      input.disabled = false;
      return;
    }
    busy = true;
    input.disabled = true;
    clearQuick();

    var typing = document.createElement("div");
    typing.className = "msg msg--bot msg--typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(typing);
    scrollDown();

    var plain = item.html.replace(/<[^>]+>/g, "");
    var delay = item.opts.delay || Math.min(1500, 430 + plain.length * 7);

    setTimeout(function () {
      typing.remove();
      bubble(item.html, item.opts.kind);
      if (item.opts.quick) setQuick(item.opts.quick);
      busy = false;
      input.disabled = false;
      if (queue.length) drain();
      else scrollDown();
    }, delay);
  }

  /* ---------- fluxos ---------- */
  function greeting() {
    say("Olá 👋 Aqui é a <b>HidroTech Atendimento 24h</b> — assistente virtual e estou respondendo <b>agora</b>.", {
      delay: 550
    });
    say(
      "Consigo passar <b>orçamento grátis</b>, agendar visita e abrir seu chamado de <b>emergência</b> em menos de 1 minuto. 🛠️",
      { delay: 420 }
    );
    menu();
  }

  function menu() {
    step = "menu";
    say("O que você precisa resolver hoje? Toque numa opção ou escreva livremente 👇", {
      quick: [
        { label: "🚰 Vazamento", action: function () { chooseService("vazamento"); } },
        { label: "🌀 Desentupimento", action: function () { chooseService("desentupimento"); } },
        { label: "⚙️ Bomba d'água", action: function () { chooseService("bomba"); } },
        { label: "🔥 Aquecedor / chuveiro", action: function () { chooseService("aquecedor"); } },
        { label: "🛁 Reforma", action: function () { chooseService("reforma"); } },
        { label: "🆘 É emergência agora", cls: "chip-btn--urgent", action: emergency }
      ]
    });
  }

  function emergency() {
    data.urgencia = "Emergência — agora";
    say("🚨 <b>Emergência registrada com prioridade</b> — plantão 24h acionado.", { kind: "alert", delay: 400 });
    say(
      "Se precisar de alguém na hora, ligue: <b><a href=\"tel:+" + PHONE_RAW + "\">" + PHONE_DISPLAY + "</a></b> — atende pessoa, 24h por dia.",
      { kind: "alert" }
    );
    say("Agora me diga o tipo de problema para eu liberar a van mais próxima:", {
      quick: Object.keys(SERVICES).map(function (key) {
        return { label: labelFor(key), action: function () { chooseService(key); } };
      })
    });
  }

  function labelFor(key) {
    var emoji = { vazamento: "🚰", desentupimento: "🌀", bomba: "⚙️", aquecedor: "🔥", reforma: "🛁" };
    return (emoji[key] || "🛠️") + " " + SERVICES[key].label;
  }

  function chooseService(key) {
    var s = SERVICES[key];
    if (!s) return;
    data.servico = s.label;

    say("<b>" + s.label + "</b> 👍\n" + s.text, { delay: 420 });
    askDescricao();
  }

  /* etapa 1: descrição curta do problema + foto/vídeo opcional */
  function askDescricao() {
    step = "descricao";
    say(
      "Para eu já chegar preparado: conte <b>em poucas palavras</b> o que está acontecendo<br>(ex.: <i>cano furado embaixo da pia da cozinha</i>) 👇",
      {
        quick: [
          { label: "📎 Foto ou vídeo do local", action: pickFile },
          { label: "⏭️ Pular descrição", action: afterDescricao }
        ]
      }
    );
    say("Se tiver, pode mandar também uma <b>foto ou vídeo</b> do local no botão 📎 abaixo — assim o técnico leva a ferramenta certa. 📷", {
      delay: 500
    });
  }

  function afterDescricao() {
    if (data.urgencia) {
      askName();
      return;
    }

    step = "urgencia";
    say("Isso está acontecendo <b>agora</b> ou posso agendar?", {
      quick: [
        { label: "⚡ Está acontecendo agora", cls: "chip-btn--urgent", action: function () { setUrgency("sim"); } },
        { label: "📅 Pode agendar", action: function () { setUrgency("nao"); } }
      ]
    });
  }

  function setUrgency(v) {
    if (v === "sim") {
      data.urgencia = "Emergência — agora";
      say("🚨 Beleza, seu chamado entrou na <b>fila de emergência</b>. Chegada média: <b>40 minutos</b>, mesmo de madrugada.", {
        kind: "alert"
      });
    } else {
      data.urgencia = "Agendado";
      say("Certo! Marquei como <b>agendamento</b> — orçamento gratuito e sem taxa de visita.", {});
    }
    askName();
  }

  function askName() {
    step = "nome";
    say("Me diga seu <b>nome</b> para eu registrar o chamado:", {});
  }

  function askTelefone() {
    step = "telefone";
    say("Por último, seu <b>WhatsApp para contato</b> — se preferir, digite <b>pular</b>.", {});
  }

  function finalize() {
    step = "fim";
    say("✅ Dados completos! Registrando seu chamado na central…", { kind: "card", delay: 400 });

    var resumo =
      "🧾 <b>RESUMO DO CHAMADO</b>\n" +
      "Serviço: " + data.servico + "\n" +
      "Urgência: " + (data.urgencia || "Normal") + "\n" +
      (data.descricao ? "Detalhe: " + esc(data.descricao) + "\n" : "") +
      (data.anexo ? "📎 Foto/vídeo do local anexado\n" : "") +
      "Nome: " + esc(data.nome) + "\n" +
      "Endereço: " + esc(data.endereco) +
      (data.telefone ? "\nWhatsApp: " + esc(data.telefone) : "") + "\n\n" +
      "⏱️ Chegada média: <b>40 min</b> · Garantia de <b>90 dias</b>";

    var acoes = {
      kind: "card",
      quick: [
        { label: "📱 Continuar no WhatsApp", action: openWhatsApp },
        { label: "📞 Ligar agora", cls: "chip-btn--go", action: openTel },
        { label: "🔄 Novo chamado", action: reset }
      ]
    };

    if (!window.HidroDB) {
      say(resumo, acoes);
      return;
    }

    window.HidroDB.criarChamado({
      nome: data.nome,
      telefone: data.telefone,
      servico: data.servico,
      urgencia: data.urgencia || "Normal",
      endereco: data.endereco,
      descricao: data.descricao || "Chamado aberto pelo chat do site.",
      origem: "chat"
    })
      .then(function (protocolo) {
        data.protocolo = protocolo;
        enviarAnexo(protocolo);
        say(
          "📋 <b>Protocolo: " + protocolo + "</b>\n" +
            "Guarde este código — é com ele que você acompanha o status na aba " +
            "<b><a href=\"pedidos.html\">Pedidos</a></b> do site.",
          { kind: "card" }
        );
        say(resumo, acoes);
      })
      .catch(function () {
        say(
          "⚠️ Não consegui registrar online agora — chame no WhatsApp que a central registra na hora.",
          { kind: "alert" }
        );
        say(resumo, acoes);
      });
  }

  /* sobe a foto/vídeo para o Supabase e vincula ao chamado */
  function enviarAnexo(protocolo) {
    if (!data.anexo || !window.HidroDB) return;
    var arq = data.anexo.file;
    var tipo = data.anexo.tipo;
    window.HidroDB.enviarAnexo(protocolo, arq)
      .then(function (url) {
        return window.HidroDB.anexarChamado(protocolo, url, tipo);
      })
      .catch(function () {
        /* upload falhou: o chamado já está registrado, não travamos o cliente */
      });
  }

  function reset() {
    if (data.anexo && data.anexo.url) URL.revokeObjectURL(data.anexo.url);
    data = {
      servico: "",
      urgencia: "",
      descricao: "",
      anexo: null,
      nome: "",
      endereco: "",
      telefone: "",
      protocolo: ""
    };
    say("Vamos de novo! 🔄", { delay: 350 });
    menu();
  }

  /* ---------- respostas de informação ---------- */
  function infoPreco() {
    say(
      "<b>Orçamento é gratuito</b> e não cobramos taxa de visita — se você aprovar o serviço, o valor já está incluso. 💰",
      {}
    );
    menu();
  }

  function infoHorario() {
    say(
      "🕐 <b>Emergências: 24 h, todos os dias</b>, inclusive feriados.\n" +
        "Seg a sex: 07h às 22h · Sáb: 07h às 18h · Domingo e feriado: plantão 24h.",
      {}
    );
    menu();
  }

  function infoArea() {
    say(
      "📍 Atendemos <b>Itapé, Ilhéus e Itabuna</b> e cidades vizinhas (DDD 73). Base: Rua 21 de Abril, Bairro Cândido Bispo.",
      {}
    );
    menu();
  }

  function handoff() {
    step = "fim";
    say("🤝 Já chamo um <b>atendente humano</b> — ele responde em minutos, 24h por dia.", {});
    say("Enquanto isso, escolha como prefere falar:", {
      quick: [
        { label: "📱 Continuar no WhatsApp", cls: "chip-btn--go", action: openWhatsApp },
        { label: "📞 Ligar agora", cls: "chip-btn--go", action: openTel },
        { label: "🔄 Voltar ao menu", action: reset }
      ]
    });
  }

  function greetAgain() {
    say("Oi! 😊 Aqui é a <b>HidroTech Atendimento 24h</b>. Como posso ajudar?", {});
    menu();
  }

  function askProblem() {
    say("Claro! Me conta qual é o problema — ou toque na opção mais parecida 👇", {});
    menu();
  }

  function dontUnderstand() {
    say("Não entendi muito bem 🤔 — posso ajudar com uma destas:", {});
    menu();
  }

  /* ---------- anexos: foto / vídeo do local ---------- */
  function pickFile() {
    if (fileInput) fileInput.click();
  }

  function mb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  }

  function handleFile(file) {
    if (!file) return;
    var imagem = /^image\//.test(file.type);
    var video = /^video\//.test(file.type);

    if (!imagem && !video) {
      say("Só consigo receber <b>foto</b> (JPG, PNG) ou <b>vídeo</b> (MP4, MOV) 📷", {});
      return;
    }
    if (file.size > MAX_ANEXO) {
      say("Esse arquivo tem <b>" + mb(file.size) + " MB</b> — o limite é <b>25 MB</b>. Pode mandar um menor? 🙏", {});
      return;
    }

    if (data.anexo && data.anexo.url) URL.revokeObjectURL(data.anexo.url);
    var url = URL.createObjectURL(file);
    var midia = imagem
      ? '<img src="' + url + '" alt="Foto enviada pelo cliente" />'
      : '<video src="' + url + '" controls playsinline preload="metadata"></video>';

    bubble(
      '<span class="msg__anexo">' + midia + "</span>" +
        '<small class="msg__anexo-name">📎 ' + esc(file.name) + " (" + mb(file.size) + " MB)</small>",
      "user"
    );

    data.anexo = { file: file, tipo: imagem ? "imagem" : "video", url: url };

    if (step === "descricao") {
      say("Recebi a foto/vídeo ✅ — agora é só <b>descrever em poucas palavras</b> o problema, ou seguir em frente:", {
        quick: [{ label: "⏭️ Seguir", action: afterDescricao }]
      });
    } else {
      say("Recebi a foto/vídeo ✅", { delay: 350 });
    }
  }

  if (attachBtn) attachBtn.addEventListener("click", pickFile);

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (f) handleFile(f);
    });
  }

  /* ---------- ações de contato ---------- */
  function openWhatsApp() {
    var lines = ["Olá! Falei pelo chat do site da HidroTech."];
    if (data.protocolo) lines.push("Protocolo: " + data.protocolo);
    if (data.servico) lines.push("Serviço: " + data.servico);
    if (data.urgencia) lines.push("Urgência: " + data.urgencia);
    if (data.descricao) lines.push("Detalhe: " + data.descricao);
    if (data.anexo) lines.push("Enviei uma foto/vídeo pelo chat do site");
    if (data.nome) lines.push("Nome: " + data.nome);
    if (data.endereco) lines.push("Endereço: " + data.endereco);
    window.open(
      "https://wa.me/" + PHONE_RAW + "?text=" + encodeURIComponent(lines.join("\n")),
      "_blank",
      "noopener"
    );
  }

  function openTel() {
    window.location.href = "tel:+" + PHONE_RAW;
  }

  /* ---------- interpretação do texto livre ---------- */
  function handleText(text) {
    if (step === "descricao") {
      if (/^\s*(pular|pula|pular descri[çc][ãa]o|n[ãa]o|nao|sem|skip|-{1,3})\s*$/i.test(text)) {
        afterDescricao();
        return;
      }
      data.descricao = text.trim().slice(0, 300);
      say("✅ Anotado!", { delay: 350 });
      afterDescricao();
      return;
    }

    if (step === "nome") {
      if (text.replace(/\s/g, "").length < 2) {
        say("Pode me dizer seu nome? 😊", {});
        return;
      }
      data.nome = text;
      step = "endereco";
      say("Pra lá, <b>" + esc(data.nome) + "</b>! Agora o <b>endereço</b> — rua, bairro ou ponto de referência:", {});
      return;
    }

    if (step === "endereco") {
      data.endereco = text;
      askTelefone();
      return;
    }

    if (step === "telefone") {
      if (!/^(pular|n[ãa]o|nao|n\/a|sem|prefiro n[ãa]o|0|-)$/i.test(text.trim())) {
        data.telefone = text.trim().slice(0, 40);
      }
      finalize();
      return;
    }

    parse(text);
  }

  function parse(text) {
    var t = text.toLowerCase();
    var has = function (re) { return re.test(t); };

    if (has(/(urg[eê]nc|emerg|socorro|transbord|inund|explod|pingando|molhando|na hora|o quanto antes)/)) return emergency();
    if (has(/(pre[çc]o|valor|or[çc]amento|quanto custa|cobra|pagamento|parcela)/)) return infoPreco();
    if (has(/(hor[aá]rio|24h|domingo|feriado|noite|madrug|de madrugada)/)) return infoHorario();
    if (has(/(regi[aã]o|onde voc|atend|cidade|d[aá] para chegar|chegam)/)) return infoArea();
    if (has(/(humano|pessoa de verdade|atendente|falar com)/)) return handoff();
    if (has(/(vaz|cano fur|tornei|pia|infiltra|pinga|registro)/)) return chooseService("vazamento");
    if (has(/(entup|esgoto|ralo|vaso sanit|descarga|gordura|n[ãa]o escoa)/)) return chooseService("desentupimento");
    if (has(/(bomba|press[aã]o|caixa d[aá]gua|sem [aá]gua|gua fra)/)) return chooseService("bomba");
    if (has(/(aquecedor|chuveiro|g[aá]s|esquentar)/)) return chooseService("aquecedor");
    if (has(/(reforma|banheiro|trocar (a )?(pia|vaso|tornei)|remodel)/)) return chooseService("reforma");
    if (has(/(encanador|profissional|servi[çc]o|ajuda|problema)/)) return askProblem();
    if (has(/(^|\s)(oi|ol[áa]|e a[ií]|bom dia|boa tarde|boa noite|hey|opa|salve)/)) return greetAgain();

    dontUnderstand();
  }

  /* ---------- abrir / fechar ---------- */
  function openChat() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (badge) badge.classList.add("is-hidden");
    if (!started) {
      started = true;
      greeting();
    }
    setTimeout(function () { input.focus(); }, 150);
  }

  function closeChat() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }

  toggle.addEventListener("click", function () {
    if (panel.hidden) openChat();
    else closeChat();
  });

  if (closeBtn) closeBtn.addEventListener("click", closeChat);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closeChat();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    bubble(esc(text), "user");
    handleText(text);
  });
})();
