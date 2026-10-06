# HidroTech — Encanador 24 Horas

Site institucional de empresa de encanamento com **atendimento e suporte 24/7**.

Site estático (HTML/CSS/JS puro), sem build, pronto para deploy no **Render Static Site**.

## Estrutura

```
.
├── index.html        # página única
├── styles.css        # estilo responsivo
├── script.js         # interações (menu, máscara, formulário, FAQ)
├── render.yaml       # blueprint do Render
└── README.md
```

## Rodar localmente

```bash
# qualquer servidor estático
npx serve .
# ou
python -m http.server 8090
```

Abra http://localhost:8090

## Deploy no Render

### Opção A — painel (mais simples)

1. Suba este repositório para um repositório GitHub.
2. Em **Render → New → Static Site**, conecte o repositório.
3. Configure:
   - **Build Command:** *(vazio)*
   - **Publish Directory:** `.`
4. Clique **Create Static Site**.

### Opção B — Blueprint (render.yaml)

Com o `render.yaml` na raiz, escolha **New → Blueprint** e aponte o repositório.
O Render lê a configuração automaticamente.

## Personalizando

| O que | Onde |
|---|---|
| Telefone / WhatsApp | `index.html` (busque por `4002-8922`) |
| E-mail e endereço | `index.html` (seção `#contato` e rodapé) |
| Cores | `styles.css` → variáveis `:root` |
| Serviços e textos | `index.html` (seções `#servicos`, `#faq`) |
