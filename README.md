# HidroTech — Encanador 24 Horas

Site institucional de empresa de encanamento com **atendimento e suporte 24/7**.

Site estático (HTML/CSS/JS puro), sem build, pronto para deploy no **Render Static Site**.

## Estrutura

```
.
├── index.html        # página única
├── css/styles.css    # estilo responsivo
├── js/script.js      # interações (menu, máscara, formulário, FAQ)
├── render.yaml       # blueprint do Render
└── README.md
```

## Rodar localmente

```bash
npx serve .
# ou
python -m http.server 8090
```

Abra http://localhost:8090

## Deploy no Render

1. Em **Render → New → Static Site**, conecte este repositório.
2. **Build Command:** (vazio)
3. **Publish Directory:** `.`
4. Clique **Create Static Site**.

Também há o blueprint `render.yaml` na raiz para o fluxo **New → Blueprint**.

## Personalizando

| O que | Onde |
|---|---|
| Telefone / WhatsApp | `index.html` (busque por `4002-8922`) |
| E-mail e endereço | `index.html` (seção `#contato` e rodapé) |
| Cores | `css/styles.css` → variáveis `:root` |
| Serviços e textos | `index.html` (seções `#servicos`, `#faq`) |
