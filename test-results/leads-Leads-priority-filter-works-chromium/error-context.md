# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: leads.spec.ts >> Leads >> priority filter works
- Location: tests\e2e\leads.spec.ts:25:7

# Error details

```
Test timeout of 60000ms exceeded while setting up "authedPage".
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e8]
          - img [ref=e16]
        - generic [ref=e19]:
          - generic [ref=e20]:
            - img [ref=e21]
            - generic [ref=e24]: Buscador de Lead
          - paragraph [ref=e25]: IA para prospecção local
      - heading "Bem-vindo de volta" [level=1] [ref=e26]
      - paragraph [ref=e27]: Entre no seu workspace
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - img [ref=e32]
          - text: E-mail ou senha inválidos
        - generic [ref=e34]:
          - text: E-mail
          - textbox "E-mail" [ref=e35]:
            - /placeholder: voce@empresa.com
            - text: e2e-1782573033928-2985@prospex.test
        - generic [ref=e36]:
          - text: Senha
          - textbox "Senha" [ref=e37]:
            - /placeholder: ••••••••
            - text: TestPass123!
      - generic [ref=e38]:
        - button "Entrar" [ref=e39] [cursor=pointer]
        - paragraph [ref=e40]:
          - text: Ainda não tem conta?
          - link "Criar conta" [ref=e41] [cursor=pointer]:
            - /url: /register
  - button "Open Next.js Dev Tools" [ref=e47] [cursor=pointer]:
    - img [ref=e48]
  - alert [ref=e51]
```