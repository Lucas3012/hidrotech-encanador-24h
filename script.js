/* =========================================================
   HidroTech — Encanador 24h · interações
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Menu mobile ---------- */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- Sombra do cabeçalho ao rolar ---------- */
  const header = document.getElementById("header");
  const onScroll = () => {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 12);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Relógio do plantão (24h) ---------- */
  const clock = document.getElementById("clock");
  const tick = () => {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  tick();
  setInterval(tick, 1000);

  /* ---------- Ano no rodapé ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Contadores do hero ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count || "0", 10);
    const dur = 1400;
    const start = performance.now();
    const fmt = (n) => n.toLocaleString("pt-BR");

    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Observador de entrada (revelar elementos) ---------- */
  const revealTargets = document.querySelectorAll(
    ".card, .step, .svc, .quote, .faq__item, .hours, .ticket"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px 160px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));

    /* rede de segurança: checagem por scroll caso o observer falhe */
    let pending = Array.from(revealTargets);
    let queued = false;
    const checkReveal = () => {
      queued = false;
      const limit = window.innerHeight * 0.94;
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < limit && r.bottom > -200) {
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", queueCheck);
        window.removeEventListener("resize", queueCheck);
      }
    };
    const queueCheck = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(checkReveal);
    };
    window.addEventListener("scroll", queueCheck, { passive: true });
    window.addEventListener("resize", queueCheck);
    queueCheck();

    /* rede de segurança: nada pode ficar invisível para sempre */
    setTimeout(() => {
      revealTargets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 400) el.classList.add("is-in");
      });
    }, 1200);

    /* dispara os contadores quando o hero estiver visível */
    const counters = document.querySelectorAll("[data-count]");
    const cio = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in"));
    document.querySelectorAll("[data-count]").forEach(animateCount);
  }

  /* ---------- Máscara de telefone ---------- */
  const fone = document.getElementById("fone");
  if (fone) {
    fone.addEventListener("input", () => {
      const v = fone.value.replace(/\D/g, "").slice(0, 11);
      let out;
      if (v.length <= 2) {
        out = v ? `(${v}` : "";
      } else if (v.length <= 6) {
        out = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length <= 10) {
        out = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
      } else {
        out = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      }
      fone.value = out;
    });
  }

  /* ---------- Envio do formulário de chamado ---------- */
  const form = document.getElementById("callForm");
  const note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome");
      const tipo = document.getElementById("tipo");
      let ok = true;

      [nome, fone, tipo].forEach((f) => {
        if (!f) return;
        const valid = f.value.trim().length > 0;
        f.classList.toggle("is-error", !valid);
        if (!valid) ok = false;
      });

      if (!ok) {
        if (note) {
          note.textContent = "⚠️ Preencha nome, telefone e tipo de serviço.";
          note.style.color = "#d63b1f";
        }
        return;
      }

      const urgente = document.getElementById("urgente");
      form.classList.add("is-sent");
      if (note) {
        note.textContent = urgente && urgente.checked
          ? "✅ Chamado de EMERGÊNCIA registrado! Nossa central liga em instantes."
          : "✅ Chamado recebido! Entraremos em contato em até 5 minutos.";
        note.style.color = "#0b8a3d";
      }

      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.textContent = "Chamado enviado ✔";
        btn.disabled = true;
      }

      form.reset();
    });

    form.querySelectorAll("input, select").forEach((f) =>
      f.addEventListener("input", () => f.classList.remove("is-error"))
    );
  }

  /* ---------- Só um FAQ aberto por vez ---------- */
  const faqItems = document.querySelectorAll(".faq__item");
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) faqItems.forEach((o) => o !== item && (o.open = false));
    });
  });
})();
