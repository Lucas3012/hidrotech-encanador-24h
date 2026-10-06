/* =========================================================
   HidroTech — camada de dados (Supabase)
   Criação e consulta de chamados + acesso do painel admin
   ========================================================= */

(function () {
  "use strict";

  var SUPA_URL = "https://babrvipqstttalumyojp.supabase.co";
  var SUPA_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYnJ2aXBxc3R0dGFsdW15b2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTI2MTEsImV4cCI6MjEwNjgyODYxMX0.zuW-d5KlV96c5dExxaFUsoJaKxng-hEZyFOylcJXAL8";
  var ADMIN_DOMAIN = "hidrotech.com.br";
  var SESSION_KEY = "hidrotech_admin_session";

  function headers(token) {
    return {
      "Content-Type": "application/json",
      apikey: SUPA_KEY,
      Authorization: "Bearer " + (token || SUPA_KEY),
    };
  }

  function rpc(nome, body, token) {
    return fetch(SUPA_URL + "/rest/v1/rpc/" + nome, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      /* funções que retornam void respondem 204 com corpo vazio */
      return res.text().then(function (txt) {
        var json = null;
        if (txt) {
          try {
            json = JSON.parse(txt);
          } catch (e) {
            json = null;
          }
        }
        if (!res.ok) {
          var erro = new Error((json && (json.message || json.error_description)) || "Falha na operação");
          erro.status = res.status;
          throw erro;
        }
        return json;
      });
    });
  }

  /* ---------- Chamados (público) ---------- */

  function criarChamado(dados) {
    dados = dados || {};
    return rpc("criar_chamado", {
      p_nome: dados.nome || "",
      p_telefone: dados.telefone || "",
      p_servico: dados.servico || "",
      p_urgencia: dados.urgencia || "Normal",
      p_endereco: dados.endereco || "",
      p_descricao: dados.descricao || "",
      p_origem: dados.origem || "site",
    });
  }

  function consultarChamado(protocolo) {
    return rpc("consultar_chamado", {
      p_protocolo: String(protocolo || "").trim().toUpperCase(),
    }).then(function (linhas) {
      return linhas && linhas.length ? linhas[0] : null;
    });
  }

  /* ---------- Painel administrativo ---------- */

  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function salvarSessao(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function limparSessao() {
    localStorage.removeItem(SESSION_KEY);
  }

  function expirada(sess) {
    return !sess || !sess.expires_at || Date.now() / 1000 > sess.expires_at - 60;
  }

  function renovar(sess) {
    return fetch(SUPA_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ refresh_token: sess.refresh_token }),
    })
      .then(function (res) {
        return res.json().then(function (json) {
          if (!res.ok) throw new Error("sessão expirada");
          var nova = {
            access_token: json.access_token,
            refresh_token: json.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
            user: json.user,
          };
          salvarSessao(nova);
          return nova;
        });
      })
      .catch(function () {
        limparSessao();
        return null;
      });
  }

  function tokenAdmin() {
    var sess = lerSessao();
    if (!sess) return Promise.resolve(null);
    if (!expirada(sess)) return Promise.resolve(sess.access_token);
    return renovar(sess).then(function (nova) {
      return nova ? nova.access_token : null;
    });
  }

  function login(usuario, senha) {
    var email = String(usuario || "").trim().toLowerCase();
    if (email.indexOf("@") === -1) email = email + "@" + ADMIN_DOMAIN;

    return fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email: email, password: senha }),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) {
          throw new Error(json.error_description || json.msg || "Usuário ou senha inválidos");
        }
        var sess = {
          access_token: json.access_token,
          refresh_token: json.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
          user: json.user,
        };
        salvarSessao(sess);
        return sess;
      });
    });
  }

  function sessaoAtual() {
    var sess = lerSessao();
    if (!sess) return null;
    if (expirada(sess)) {
      /* tenta renovar em segundo plano */
      renovar(sess);
      return null;
    }
    return sess;
  }

  function listarChamados() {
    return tokenAdmin().then(function (token) {
      if (!token) {
        var e = new Error("nao_logado");
        e.naoLogado = true;
        throw e;
      }
      return rpc("listar_chamados", {}, token);
    });
  }

  function atualizarChamado(protocolo, status, nota) {
    return tokenAdmin().then(function (token) {
      if (!token) throw new Error("nao_logado");
      return rpc(
        "atualizar_chamado",
        {
          p_protocolo: protocolo,
          p_status: status,
          p_nota: nota === undefined || nota === null ? null : nota,
        },
        token
      );
    });
  }

  function excluirChamado(protocolo) {
    return tokenAdmin().then(function (token) {
      if (!token) throw new Error("nao_logado");
      return rpc("excluir_chamado", { p_protocolo: protocolo }, token);
    });
  }

  window.HidroDB = {
    criarChamado: criarChamado,
    consultarChamado: consultarChamado,
    login: login,
    logout: limparSessao,
    sessaoAtual: sessaoAtual,
    listarChamados: listarChamados,
    atualizarChamado: atualizarChamado,
    excluirChamado: excluirChamado,
  };
})();
