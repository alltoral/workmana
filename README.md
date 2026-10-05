# Workmana

App de gestão de tarefas da Alltoral — Kanban + Timeline, com múltiplas equipes isoladas, login por nome + senha, permissões, checklist, participantes, controle de tempo com calculadora de horas, chat por tarefa e anexos de arquivo. Front-end puro (HTML/CSS/JS, um único arquivo), sincronizado em tempo real via Firebase Firestore, instalável como app (PWA) e funciona offline.

## Estrutura

```
/
├── index.html               ← o app inteiro (HTML + CSS + JS em um único arquivo)
├── manifest.json            ← metadados do app instalável (PWA)
├── sw.js                    ← service worker (permite instalar e abrir offline a interface)
├── favicon.ico
├── favicon-16.png / favicon-32.png
├── apple-touch-icon.png     ← ícone usado no iOS ao "Adicionar à Tela de Início"
├── icon-192.png / icon-512.png
├── icon-192-maskable.png / icon-512-maskable.png   ← versões com margem de segurança para Android
└── README.md                ← este guia
```

Todos esses arquivos precisam ficar juntos, na **raiz** do repositório (não dentro de nenhuma subpasta), para os caminhos relativos (`./manifest.json`, `./sw.js`, `./icon-192.png` etc.) funcionarem.

## 1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto (ou use um existente).
2. **Firestore Database** → *Criar banco de dados* → modo produção.
3. **Authentication** → *Sign-in method* → habilite o provedor **Anônimo**.
   - Isso não é o login que os usuários veem — o app continua com o próprio sistema de perfil + senha. O anônimo do Firebase só autoriza o navegador a ler/escrever no Firestore.
4. **Firestore Database → Regras**, cole:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /teams/{teamId} {
         allow read, create, update: if request.auth != null;
         allow delete: if false;
       }
       match /memberIndex/{normalizedName} {
         allow read, write: if request.auth != null;
       }
       match /teams/{teamId}/attachments/{attachmentId} {
         allow read, create, delete: if request.auth != null;
       }
     }
   }
   ```

   A coleção `teams` guarda os dados de cada equipe (integrantes, tarefas, checklist, chat, etc. — tudo num único documento por equipe). A coleção `memberIndex` é um índice simples que liga "nome completo normalizado" → `{teamId, memberId}`, usado só pra permitir login por nome + senha sem precisar do código de convite toda vez — veja "Como funciona o login" abaixo. A subcoleção `attachments` guarda os arquivos anexados às tarefas — tudo dentro do Firestore, sem precisar do Firebase Storage nem de plano pago (veja "Anexos de arquivo").

5. **Configurações do projeto → Seus apps** → adicione um app **Web** (ícone `</>`) e copie o objeto `firebaseConfig` gerado.

## 2. Colar a configuração no `index.html`

Abra `index.html`, procure por `firebaseConfig` (perto do início da tag `<script>`) e substitua pelos seus valores:

```javascript
var firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

A `apiKey` do Firebase não é secreta — pode subir pro GitHub sem problema. Quem protege os dados são as regras do Firestore do passo anterior.

## 3. Publicar com GitHub Pages

1. Suba este repositório pro GitHub (com `index.html` na raiz).
2. **Settings → Pages** → Source: `Deploy from a branch` → branch `main`, pasta `/root` → Save.
3. Após alguns minutos, o GitHub Pages gera uma URL tipo `https://seu-usuario.github.io/nome-do-repo/`.
4. No Firebase Console → **Authentication → Settings → Authorized domains**, adicione esse domínio (`seu-usuario.github.io`), senão o login anônimo pode ser bloqueado.

Pronto. A primeira pessoa que abrir o link cria a própria equipe (nome da equipe + seu nome + cargo opcional + senha) e recebe um código de convite; esse código é o que ela compartilha com o resto do time pra eles entrarem na mesma equipe. Cada equipe tem seus próprios dados, completamente separados das demais.

## Instalar como app

- **Android / Chrome / Edge (desktop)**: um botão "⬇ Instalar app" aparece na tela de login e dentro do app assim que o navegador permitir. Também dá pra usar o ícone de instalação que o próprio navegador mostra na barra de endereço.
- **iPhone / iPad (Safari)**: não existe esse botão automático — abra o site no Safari, toque no ícone de compartilhar (o quadrado com a seta pra cima) e escolha **"Adicionar à Tela de Início"**.

## Como funciona o login

- **Código de convite** — serve só pra trazer uma pessoa nova pra dentro da equipe pela primeira vez. É o(a) líder quem compartilha esse código; sem ele, ninguém entra numa equipe que não é a sua.
- **Nome completo + senha** — depois que a pessoa já foi cadastrada uma vez (seja criando a equipe, seja entrando via código, seja adicionada direto pelo(a) líder), ela consegue logar de **qualquer dispositivo** só digitando nome completo e senha, sem precisar do código de novo. Essa é a forma pensada pro dia a dia.
- Isso funciona por um índice interno (`memberIndex`) que liga cada nome completo à equipe/perfil correspondente. **Se duas pessoas em equipes diferentes tiverem exatamente o mesmo nome completo**, só a primeira que se cadastrar com esse nome consegue usar o atalho de nome+senha; a segunda continua funcionando normalmente, só precisa entrar pelo código de convite da própria equipe (que sempre funciona, mesmo nesse caso).
- Cada dispositivo "lembra" a última equipe usada (pra não pedir o código de novo a cada vez); o botão "Sair" desloga a pessoa mas mantém o dispositivo associado à equipe. "Não é essa equipe? Trocar" (na tela de escolher perfil) esquece a equipe do dispositivo por completo.

## Como funciona o sistema de equipes e permissões

- Quem abre o app pela primeira vez escolhe entre **entrar na equipe já existente** (nome + senha), **criar uma equipe nova** (vira o(a) líder dela e recebe um código de convite) ou **entrar com um código de convite** que o(a) líder de uma equipe já existente compartilhou.
- Só o(a) **líder da equipe** (👑, marcado com coroa) vê o código de convite (em Equipe → topo do modal), pode adicionar integrantes diretamente pelo nome, remover integrantes e dar a permissão **"Move tudo"** — que permite mover/mudar o status de qualquer tarefa da equipe, não só das próprias.
- Sem "Move tudo", cada pessoa só arrasta/edita o status das tarefas em que ela é a responsável (ou que estão sem responsável).
- Cada integrante pode trocar a própria foto de perfil e editar o próprio cargo a qualquer momento (Equipe → clicar na foto ou no campo de cargo). Fotos são comprimidas automaticamente antes de salvar.
- Se o(a) líder remover alguém que está com o app aberto em outro dispositivo, essa pessoa é derrubada na hora (com aviso) e volta pra tela de login.

## Tarefas: o que cada uma pode ter

Além de título, descrição, prioridade, responsável e prazo, cada tarefa tem:

- **Checklist** — sub-tarefas com caixinha de marcar, texto editável (clique pra editar) e barra de progresso. Salva na hora, sem precisar clicar em "Salvar tarefa". Aparece como badge "☑ 3/5" no card do Kanban.
- **Participantes** — além do responsável principal, dá pra marcar outros integrantes que estão ajudando naquela tarefa (chips de seleção múltipla). Quem é participante também vê a tarefa ao filtrar pelo próprio nome/avatar, não só quem é responsável.
- **Calculadora de horas** — só visível pra quem é o responsável da tarefa. Mostra o tempo já registrado (pelo cronômetro da florzinha 🌸, ou ajustado na mão nos campos de horas e minutos) e, com base num "valor da sua hora" que cada pessoa configura uma vez (fica salvo no perfil, não por tarefa), calcula quanto aquele tempo já rendeu. É privado — só o próprio responsável vê o valor da hora e o total.
- **Relatório de horas** — botão "Relatório ⏱" no topo. Escolha o período (este mês, mês passado, últimos 7/30 dias, hoje, todo o período ou datas personalizadas) e, se quiser, uma pessoa específica. As horas aparecem em linhas (pessoa, tarefa, data, horas) que dá pra **editar, apagar e adicionar** antes de baixar, pra conferir se está tudo certo. As edições valem só para o relatório e não alteram as tarefas. Dá pra baixar em **CSV** (abre no Excel/Google Planilhas, com total por pessoa e total geral) ou **Imprimir / PDF**. O valor em R$ só aparece nas linhas da própria pessoa logada, usando o valor da hora dela.
  - O relatório por período depende do registro de tempo por data (`timeLog` em cada tarefa), que é gravado a cada vez que o cronômetro é pausado ou o tempo é ajustado. O tempo acumulado antes dessa atualização entra como uma única entrada datada pela criação da tarefa; se precisar, corrija a data direto no relatório.
- **Cronômetro (a florzinha)** — botão "▶ Estou nessa" / "⏸ Pausar tempo", visível só pra quem é o responsável. Enquanto ativo, uma flor gira no card e o tempo conta em tempo real, visível pra toda a equipe.
- **Chat / recados** — dúvidas ou avisos por tarefa, sincronizados em tempo real. Cada pessoa pode editar ou apagar as próprias mensagens (aparece "· editado" quando uma mensagem foi alterada).
- **Anexos** — arquivos anexados à tarefa (veja a seção própria abaixo), com miniatura clicável pra imagens.

## Kanban e Timeline

- **Kanban**: 4 colunas (A fazer, Em andamento, Em revisão, Concluído). Tarefas atrasadas (prazo vencido, ainda não concluídas) ficam com o card amarelo. Tarefas concluídas viram uma barrinha preta e estreita, mostrando só o nome e a data de conclusão — e **somem sozinhas da visualização 24h depois de concluídas** (arquivadas, não apagadas: reaparecem se você buscar pelo nome na busca do app).
- **Timeline**: visão estilo Gantt dos próximos 14 dias. O filtro por pessoa (clicar no chip de um integrante) mostra as tarefas em que ela é responsável **ou** participante.

## Modo offline

O app funciona sem internet, incluindo os anexos:

- **Interface**: o service worker guarda o "esqueleto" do app (HTML, CSS, JS, ícones), então ele abre mesmo sem conexão.
- **Dados** (tarefas, checklist, chat, equipe, anexos): o Firestore guarda uma cópia local no navegador e enfileira qualquer alteração feita offline — criar tarefa, mudar status, marcar item da checklist, mandar recado, anexar arquivo — pra enviar sozinho assim que a conexão voltar. Um selo amarelo "● Offline" aparece no topo quando isso está acontecendo.

## Anexos de arquivo

Cada tarefa tem uma seção "Anexos" no modal de edição. Qualquer pessoa da equipe pode:
- Anexar um ou vários arquivos de uma vez (limite de ~700KB por arquivo depois de processado)
- Ver uma **miniatura clicável** pra imagens — clicar abre um visualizador dentro do próprio app (sem sair pra nova aba); clicar no nome do arquivo baixa
- Remover um anexo

Um contador "📎 N" aparece no card do Kanban quando a tarefa tem anexos, do lado dos contadores de recados e checklist.

**Por que o limite de 700KB?** Os arquivos ficam salvos direto no Firestore (convertidos pra texto), sem usar o Firebase Storage — assim o app roda inteiro no plano gratuito do Firebase, sem precisar de cartão de crédito nem do plano pago Blaze (que a Google passou a exigir pro Storage a partir de outubro de 2024). O Firestore tem um limite de 1MB por "documento"; 700KB fica com boa margem de segurança dentro disso.

**Fotos são comprimidas automaticamente** antes de salvar (redimensionadas e convertidas pra JPEG direto no navegador da pessoa, sem precisar de internet pra isso) — então uma foto de celular de vários MB normalmente entra sem problema. Isso vale só pra imagens; outros tipos de arquivo (PDF, planilha, etc.) precisam já vir dentro do limite de 700KB. A mesma compressão automática é usada nas fotos de perfil.

## Limitações a saber

- **A separação entre equipes é garantida pela aplicação, não pelas regras do Firestore.** As regras permitem que qualquer usuário autenticado (mesmo anonimamente) leia/escreva qualquer documento das coleções `teams` e `memberIndex` — é assim que a busca por código de convite e por nome funciona. Isso significa que alguém com conhecimento técnico *poderia*, em teoria, tentar adivinhar nomes cadastrados e testar senhas sem limite de tentativas (não há bloqueio por tentativas erradas). Pra a maioria dos times isso é um risco aceitável, mas se sua equipe lida com informação muito sensível, vale considerar Firebase Auth "de verdade" (com e-mail/senha por usuário) no lugar do login por nome+PIN.
- **Fotos de perfil e anexos de arquivo** ficam salvos como base64 no Firestore — fotos de perfil dentro do documento da equipe (que tem limite de 1MB no total, dividido entre integrantes, tarefas, checklist e chat), anexos numa subcoleção separada (cada um com seu próprio limite de ~700KB). Com uso normal de uma equipe pequena isso não deve dar problema.
- **Último a salvar vence** — não há resolução de conflito no documento principal da equipe. Se duas pessoas editarem a mesma tarefa no mesmo instante, uma sobrescreve a outra. Para uma equipe pequena isso raramente é um problema real.
- O login por PIN é uma trava de uso interno da equipe, não uma autenticação robusta de verdade (não usa senha criptografada, recuperação de senha, etc.).
- O valor da hora de cada pessoa fica salvo no Firestore como qualquer outro dado — é tratado como privado pela *interface* (só aparece pra quem é dono do valor), mas, assim como o restante dos dados, não é criptografado no banco.
