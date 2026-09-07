/* ============================================================================
   Davi Guerreiro - Desenvolvedor de Software
   JavaScript nativo, sem dependencias.

   01. Rolagem: um unico observador compartilhado
   02. Estado do header
   03. Menu mobile
   04. Revelacao ao rolar
   05. Secao ativa: navegacao e regua
   06. Regua-margem: progresso e tiques
   07. Formulario de contato
   08. Ano do rodape
   09. Modal de projeto
   ========================================================================= */

(function () {
  'use strict';

  var SECOES = [
    { id: 'inicio',   rotulo: 'Início' },
    { id: 'sobre',    rotulo: 'Sobre' },
    { id: 'stack',    rotulo: 'Stack' },
    { id: 'projetos', rotulo: 'Trabalhos' },
    { id: 'servicos', rotulo: 'Serviços' },
    { id: 'contato',  rotulo: 'Contato' }
  ];

  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* 01. ROLAGEM ============================================================
     Um listener so, com rAF, distribuindo para quem precisa. Evita varios
     handlers concorrendo no mesmo evento. */

  var reagentes = [];
  var agendado = false;

  function despachar() {
    agendado = false;
    for (var i = 0; i < reagentes.length; i++) reagentes[i]();
  }

  window.addEventListener('scroll', function () {
    if (agendado) return;
    agendado = true;
    window.requestAnimationFrame(despachar);
  }, { passive: true });


  /* 02. ESTADO DO HEADER =================================================== */

  var header = document.getElementById('header');

  if (header) {
    reagentes.push(function () {
      header.classList.toggle('is-stuck', window.scrollY > 24);
    });
  }


  /* 03. MENU MOBILE ======================================================== */

  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');

  if (toggle && menu) {
    var linksDoMenu = menu.querySelectorAll('a');
    var conteudo = document.getElementById('conteudo');

    var abrirMenu = function () {
      menu.classList.add('is-open');
      menu.removeAttribute('inert');
      // O conteudo atras do overlay sai da ordem de foco e da arvore de acessibilidade.
      if (conteudo) conteudo.setAttribute('inert', '');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
      document.body.classList.add('is-locked');
      // Um quadro de espera: so da para focar depois que o menu deixa de ser
      // 'visibility: hidden'.
      window.requestAnimationFrame(function () {
        if (linksDoMenu.length) linksDoMenu[0].focus();
      });
    };

    var fecharMenu = function (devolverFoco) {
      menu.classList.remove('is-open');
      menu.setAttribute('inert', '');
      if (conteudo) conteudo.removeAttribute('inert');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('is-locked');
      if (devolverFoco) toggle.focus();
    };

    var menuAberto = function () {
      return toggle.getAttribute('aria-expanded') === 'true';
    };

    toggle.addEventListener('click', function () {
      if (menuAberto()) fecharMenu(true);
      else abrirMenu();
    });

    // Um link escolhido fecha o menu e deixa a ancora rolar.
    linksDoMenu.forEach(function (link) {
      link.addEventListener('click', function () { fecharMenu(false); });
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && menuAberto()) fecharMenu(true);
    });

    // O menu some se a viewport voltar ao layout de desktop.
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (evento) {
      if (evento.matches && menuAberto()) fecharMenu(false);
    });
  }


  /* 04. REVELACAO AO ROLAR ================================================= */

  var revelaveis = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window) || movimentoReduzido) {
    revelaveis.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observadorRevelacao = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-visible');
        observadorRevelacao.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .1 });

    revelaveis.forEach(function (el) { observadorRevelacao.observe(el); });
  }


  /* 05. SECAO ATIVA ======================================================== */

  var navLinks = document.querySelectorAll('.nav__link');
  var rotuloRegua = document.getElementById('rail-label');

  var alvos = SECOES
    .map(function (secao) {
      var el = document.getElementById(secao.id);
      return el ? { el: el, id: secao.id, rotulo: secao.rotulo } : null;
    })
    .filter(Boolean);

  if (alvos.length && 'IntersectionObserver' in window) {
    var visiveis = new Set();

    var observadorSecao = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) visiveis.add(entrada.target.id);
        else visiveis.delete(entrada.target.id);
      });

      // A ativa e a primeira, na ordem do documento, que cruza o meio da tela.
      var ativa = alvos.filter(function (a) { return visiveis.has(a.id); })[0];

      navLinks.forEach(function (link) {
        if (ativa && link.getAttribute('href') === '#' + ativa.id) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      if (rotuloRegua && ativa) rotuloRegua.textContent = ativa.rotulo;
    }, { rootMargin: '-45% 0px -45% 0px' });

    alvos.forEach(function (alvo) { observadorSecao.observe(alvo.el); });
  }


  /* 06. REGUA-MARGEM ======================================================= */

  var trilho = document.getElementById('rail-track');
  var preenchimento = document.getElementById('rail-fill');
  var tiques = [];

  function percorrivel() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function montarTiques() {
    if (!trilho) return;

    tiques.forEach(function (t) { t.el.remove(); });
    tiques = [];

    var total = percorrivel();
    if (total <= 0) return;

    alvos.forEach(function (alvo) {
      var razao = Math.min(alvo.el.offsetTop / total, 1);
      var el = document.createElement('span');
      el.className = 'rail__tick';
      el.style.top = (razao * 100).toFixed(3) + '%';
      trilho.appendChild(el);
      tiques.push({ el: el, razao: razao });
    });
  }

  function sincronizarRegua() {
    if (!preenchimento) return;

    var total = percorrivel();
    var progresso = total > 0 ? Math.min(window.scrollY / total, 1) : 0;
    preenchimento.style.height = (progresso * 100).toFixed(2) + '%';

    tiques.forEach(function (t) {
      t.el.classList.toggle('is-passed', progresso >= t.razao - .002);
    });
  }

  if (trilho && preenchimento) {
    reagentes.push(sincronizarRegua);

    // A altura do documento muda com fonte carregada, imagem e redimensionamento.
    window.addEventListener('resize', function () {
      montarTiques();
      sincronizarRegua();
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        montarTiques();
        sincronizarRegua();
      }).observe(document.body);
    }
  }


  /* 07. FORMULARIO DE CONTATO ============================================== */

  var WHATSAPP = '5561983207986';
  var formulario = document.getElementById('form-contato');

  if (formulario) {
    var aviso = document.getElementById('form-status');

    var regras = {
      nome: function (v) {
        if (!v) return 'Informe seu nome.';
        if (v.length < 2) return 'Nome muito curto.';
        return '';
      },
      email: function (v) {
        if (!v) return 'Informe um e-mail para retorno.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Esse e-mail parece incompleto.';
        return '';
      },
      tipo: function (v) {
        if (!v) return 'Escolha o tipo de projeto.';
        return '';
      },
      mensagem: function (v) {
        if (!v) return 'Descreva o projeto em algumas linhas.';
        if (v.length < 10) return 'Conte um pouco mais: pelo menos 10 caracteres.';
        return '';
      }
    };

    var campo = function (nome) { return formulario.elements[nome]; };

    var mostrarErro = function (nome, mensagem) {
      var controle = campo(nome);
      var destino = document.getElementById('erro-' + nome);

      if (mensagem) {
        controle.setAttribute('aria-invalid', 'true');
        destino.textContent = mensagem;
        destino.hidden = false;
      } else {
        controle.removeAttribute('aria-invalid');
        destino.textContent = '';
        destino.hidden = true;
      }
    };

    var validar = function (nome) {
      var mensagem = regras[nome](campo(nome).value.trim());
      mostrarErro(nome, mensagem);
      return !mensagem;
    };

    Object.keys(regras).forEach(function (nome) {
      var controle = campo(nome);
      controle.addEventListener('blur', function () { validar(nome); });
      // Um campo ja marcado como invalido se corrige enquanto a pessoa digita.
      controle.addEventListener('input', function () {
        if (controle.getAttribute('aria-invalid') === 'true') validar(nome);
      });
    });

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      aviso.textContent = '';

      var invalidos = Object.keys(regras).filter(function (nome) { return !validar(nome); });

      if (invalidos.length) {
        campo(invalidos[0]).focus();
        return;
      }

      var texto = [
        'Olá, Davi. Meu nome é ' + campo('nome').value.trim() + '.',
        'Tipo de projeto: ' + campo('tipo').value,
        'E-mail para retorno: ' + campo('email').value.trim(),
        '',
        campo('mensagem').value.trim()
      ].join('\n');

      var janela = window.open(
        'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto),
        '_blank',
        'noopener'
      );

      aviso.textContent = janela
        ? 'WhatsApp aberto com a sua mensagem. Falta apenas enviar por lá.'
        : 'O navegador bloqueou a abertura. Fale direto no 61 98320-7986 ou por davi2004d@gmail.com.';
    });
  }


  /* 08. ANO DO RODAPE ====================================================== */

  var ano = document.getElementById('ano');
  if (ano) ano.textContent = String(new Date().getFullYear());


  /* 09. MODAL DE PROJETO ===================================================
     Os dados vivem aqui, nao no HTML: acrescentar um projeto e acrescentar
     uma chave neste objeto mais um botao com o 'data-projeto' correspondente. */

  var PROJETOS = {
    darkink: {
      titulo: 'Dark Ink Studio — Plataforma de Agendamento',

      resumo: [
        'O cliente escolhe artista, serviço, dia e horário, confirma com nome e telefone e ' +
        'recebe um link próprio para acompanhar a sessão — tudo sem criar conta. Do outro ' +
        'lado, o estúdio entra num painel privado, vê a agenda do dia e muda o status de ' +
        'cada atendimento.',

        'As regras de negócio vivem em funções puras, sem I/O e sem relógio próprio: o "agora" ' +
        'é injetado, então cada regra é testável isolada. E a garantia que mais importa não ' +
        'está no código — está no banco. O estúdio é fictício: artistas, serviços e preços ' +
        'são conteúdo de demonstração. A plataforma, não.'
      ],

      imagens: [
        {
          src: 'assets/images/darkink-home.png', largura: 1440, altura: 900,
          rotulo: 'Início',
          alt: 'Página inicial do Dark Ink Studio: título "Cada linha é permanente", o texto sobre a agenda aberta com 40 dias e os botões de agendar sessão e ver os artistas.',
          legenda: 'A abertura do site: tipografia, uma linha dourada e o caminho direto para a agenda.'
        },
        {
          src: 'assets/images/darkink-servicos.png', largura: 1440, altura: 900,
          rotulo: 'Serviços',
          alt: 'Seção "O que sai daqui": quatro serviços em grade — fine line, blackwork, realismo preto e cinza e cover-up — cada um com duração e preço inicial.',
          legenda: 'Os serviços em folha de flash: duração e preço de partida, sem tabela escondida.'
        },
        {
          src: 'assets/images/darkink-agendar-servico.png', largura: 1440, altura: 900,
          rotulo: 'Etapa 1',
          alt: 'Etapa 1 de 5, "O que você quer tatuar?": os quatro serviços em cartões, ao lado da ficha de sessão ainda com todos os campos vazios.',
          legenda: 'Etapa 1 de 5. A duração escolhida aqui é o que define os horários lá na frente.'
        },
        {
          src: 'assets/images/darkink-agendar-data.png', largura: 1440, altura: 1198,
          rotulo: 'Calendário',
          alt: 'Etapa 3 de 5, "Que dia?": calendário de setembro e outubro de 2026, com os dias sem horário livre apagados e a ficha já mostrando serviço, duração e artista.',
          legenda: 'A agenda abre 40 dias à frente. Dia sem vaga não é clicável — a checagem vem do banco.'
        },
        {
          src: 'assets/images/darkink-agendar-horario.png', largura: 1440, altura: 900,
          rotulo: 'Horários',
          alt: 'Etapa 4 de 5, "A que horas?": dois horários livres, 18:00 e 19:00, com o fim de cada sessão calculado abaixo.',
          legenda: 'Só sobra o que cabe: a duração do serviço é descontada do que já está reservado.'
        },
        {
          src: 'assets/images/darkink-agendar-dados.png', largura: 1440, altura: 1019,
          rotulo: 'Seus dados',
          alt: 'Etapa 5 de 5, "Quase lá": campos de nome, e-mail, telefone, link de referência e observações, com o botão "Reservar horário".',
          legenda: 'Etapa 5 de 5. Nome, e-mail e telefone — e nenhum campo de senha: não se cria conta.'
        },
        {
          src: 'assets/images/darkink-confirmacao.png', largura: 1440, altura: 1095,
          rotulo: 'Confirmação',
          alt: 'Página de confirmação com selo dourado: ficha da sessão #DK-9652 com serviço, artista, data, horário, duração e os dados de contato do cliente.',
          legenda: 'O comprovante vive em /agendamento/{token}, um UUID do banco. Sem cadastro e sem senha.'
        },
        {
          src: 'assets/images/darkink-login.png', largura: 1440, altura: 900,
          rotulo: 'Entrada',
          alt: 'Tela "Área do estúdio" com campos de e-mail e senha, botão Entrar e um link para a agenda pública.',
          legenda: 'A porta do painel. Quem vem marcar sessão é mandado de volta para a agenda pública.'
        },
        {
          src: 'assets/images/darkink-painel.png', largura: 1751, altura: 706,
          rotulo: 'Painel',
          alt: 'Painel do estúdio, "Hoje no estúdio": quatro números — sessões hoje, confirmadas, aguardando confirmação e horários livres — e o cartão da próxima sessão.',
          legenda: 'O que o estúdio vê ao entrar: o dia em quatro números e a próxima sessão à frente.'
        },
        {
          src: 'assets/images/darkink-agenda.png', largura: 485, altura: 643,
          rotulo: 'Agenda do dia',
          alt: 'Agenda do dia em coluna contínua das 10h às 20h, com os horários livres marcados e duas sessões pendentes, cada uma com os botões Confirmar e Cancelar.',
          legenda: 'A coluna das 10h às 20h. O horário livre aparece como linha vazia, e cada sessão se confirma ou cancela ali mesmo.'
        }
      ],

      decisoes: [
        { rotulo: 'Overbooking',
          texto: 'Uma EXCLUDE USING gist compara intervalos de tempo por artista, com ' +
                 'btree_gist para casar igualdade e sobreposição na mesma constraint. Dois ' +
                 'clientes pedindo o mesmo horário no mesmo instante: o segundo recebe 23P01, ' +
                 'traduzido em "este horário acabou de ser reservado". Sem lock e sem transação ' +
                 'manual. Unicidade simples não resolveria — serviços têm durações diferentes, ' +
                 'e 14h–16h não colide com 15h–16h pelo horário de início.' },
        { rotulo: 'Dados do cliente',
          texto: 'O papel anon não tem acesso nenhum à tabela de agendamentos. Conceder SELECT ' +
                 'para validar disponibilidade exporia nome, e-mail e telefone de todo mundo: a ' +
                 'reserva acontece no servidor e a consulta de disponibilidade devolve apenas horários.' },
        { rotulo: 'Fuso',
          texto: 'Nenhuma data passa por new Date(). O servidor roda em UTC e, às 22h de ' +
                 'Brasília, já virou o dia. Todo "agora" vem de studioNow(), que lê o instante ' +
                 'em America/Sao_Paulo.' },
        { rotulo: 'Domínio puro',
          texto: 'Disponibilidade e regras de reserva são funções sem I/O, que recebem os ' +
                 'agendamentos já lidos e o relógio por parâmetro. Não conhecem Supabase nem ' +
                 'React — por isso 84 testes cobrem cada regra isolada, sem subir banco.' },
        { rotulo: 'Chave de serviço',
          texto: 'A chave administrativa do Supabase só é usada por um módulo, e esse módulo ' +
                 'importa server-only. Se alguém tentar importá-lo num componente de cliente, ' +
                 'o build quebra em vez de a chave vazar.' },
        { rotulo: 'Acesso sem conta',
          texto: 'O acompanhamento fica em /agendamento/{token}, um UUID gerado pelo banco. Sem ' +
                 'cadastro, sem senha e sem id sequencial que permita adivinhar o agendamento ' +
                 'de outra pessoa.' },
        { rotulo: 'Acessibilidade',
          texto: 'Um script de QA roda axe-core sobre a landing, as cinco etapas do agendamento ' +
                 'e o login — tudo que se alcança sem sessão.' }
      ],

      numeros: [
        { rotulo: 'Testes', texto: '84 unitários no Vitest, sobre disponibilidade, regras de reserva, telefone, status e fuso' },
        { rotulo: 'Banco', texto: '4 tabelas, 6 políticas de RLS e a trava anti-overbooking — 524 linhas de SQL re-executável' },
        { rotulo: 'Telas', texto: '6 — landing, agendamento em etapas, acompanhamento por link, login, painel e agenda do dia' },
        { rotulo: 'Código', texto: 'Cerca de 5.500 linhas de TypeScript e TSX, em 58 arquivos' },
        { rotulo: 'Documentação', texto: 'Decisões de arquitetura registradas no repositório, com o porquê de cada uma' }
      ],

      tecnologias: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'shadcn/ui',
        'Base UI', 'Supabase', 'PostgreSQL', 'Zod 4', '@react-pdf/renderer', 'Vitest', 'axe-core'],

      acoes: [
        { rotulo: 'Ver código', href: 'https://github.com/dvzn00/DARKTATOO', externo: true, principal: true },
        { rotulo: 'Baixar agenda de exemplo', href: 'assets/pdf/dark-ink-agenda-2026-09-07.pdf', baixar: true }
      ]
    },

    cashflow: {
      titulo: 'Cashflow — Dashboard Financeiro Pessoal',

      resumo: [
        'Aplicação de gestão financeira pessoal com múltiplos usuários. Cada conta enxerga ' +
        'apenas os próprios dados, o mês é acompanhado em três tipos de gráfico e o extrato ' +
        'sai em PDF gerado no servidor.',

        'O escopo foi puxado deliberadamente para além de um CRUD: orçamento por categoria ' +
        'com aviso ao passar do limite, categorias que o próprio usuário cria e edita, tema ' +
        'claro e escuro que sobrevive entre sessões, e cálculo monetário que não perde centavo.'
      ],

      imagens: [
        {
          src: 'assets/images/cashflow-dashboard.png', largura: 1740, altura: 712,
          rotulo: 'Dashboard',
          alt: 'Dashboard com saldo total, receitas, despesas e taxa de economia do mês, acima de um gráfico de barras diário.',
          legenda: 'Saldo, receitas, despesas e taxa de economia do mês, com o ritmo diário logo abaixo.'
        },
        {
          src: 'assets/images/cashflow-graficos.png', largura: 1735, altura: 710,
          rotulo: 'Gráficos',
          alt: 'Gráfico de pizza de despesas por categoria, anéis de progresso dos orçamentos e gráfico de linha da evolução mensal.',
          legenda: 'Despesas por categoria, andamento dos orçamentos e a evolução do ano em linha.'
        },
        {
          src: 'assets/images/cashflow-transacoes.png', largura: 1740, altura: 817,
          rotulo: 'Transações',
          alt: 'Tabela de transações do mês com data, categoria, descrição e valor, e filtros de mês, categoria e tipo.',
          legenda: 'Lançamentos do mês com filtro por categoria e por tipo, e o total da página no rodapé.'
        },
        {
          src: 'assets/images/cashflow-relatorios.png', largura: 1743, altura: 820,
          rotulo: 'Relatórios',
          alt: 'Tela de relatórios com o resumo do mês e o botão de gerar PDF.',
          legenda: 'Resumo do período e o botão que gera o extrato em PDF no servidor.'
        },
        {
          src: 'assets/images/cashflow-configuracoes.png', largura: 1066, altura: 1772,
          rotulo: 'Configurações',
          alt: 'Tela de configurações com a lista de categorias, os limites mensais por categoria, os dados de perfil e a troca de tema.',
          legenda: 'Categorias, limite mensal de cada uma, perfil e troca de tema. Tela alta: role dentro dela para ver o resto.'
        },
        {
          src: 'assets/images/cashflow-login.png', largura: 1067, altura: 501,
          rotulo: 'Entrar',
          alt: 'Tela de login com campos de e-mail e senha.',
          legenda: 'Entrada por e-mail e senha, sobre o Supabase Auth.'
        },
        {
          src: 'assets/images/cashflow-criar-conta.png', largura: 1067, altura: 502,
          rotulo: 'Criar conta',
          alt: 'Tela de cadastro de nova conta.',
          legenda: 'Cadastro aberto, com confirmação de e-mail ligada.'
        }
      ],

      decisoes: [
        { rotulo: 'Valores',
          texto: 'Toda conta roda em centavos inteiros. Em ponto flutuante, 0,1 + 0,2 devolve ' +
                 '0,30000000000000004; convertendo para centavo antes de somar e dividindo só no ' +
                 'fim, o centavo sempre fecha.' },
        { rotulo: 'Isolamento',
          texto: 'Row Level Security no Supabase: transactions, categories e budgets filtram por ' +
                 'user_id = auth.uid(). O isolamento é do banco, não da aplicação.' },
        { rotulo: 'PDF',
          texto: 'Gerado no servidor com @react-pdf/renderer, em API Route do Next.js. O clique em ' +
                 'Gerar PDF já entrega o arquivo baixado.' },
        { rotulo: 'Datas',
          texto: 'Guardadas como DATE, sem fuso, e manipuladas como texto ISO — assim nenhuma virada ' +
                 'de dia depende do relógio de quem acessa.' },
        { rotulo: 'Gráficos',
          texto: 'Recharts em import dinâmico com ssr: false, para não quebrar a hidratação do Next.js.' },
        { rotulo: 'Autenticação',
          texto: 'Supabase Auth por e-mail e senha, com cadastro aberto e confirmação de e-mail ativa.' },
        { rotulo: 'Tema',
          texto: 'next-themes com shadcn/ui; a escolha fica no localStorage e volta na sessão seguinte.' }
      ],

      numeros: [
        { rotulo: 'Telas', texto: 'Dashboard, Transações, Relatórios e Configurações' },
        { rotulo: 'Banco', texto: '4 tabelas — profiles, categories, transactions e budgets' },
        { rotulo: 'Gráficos', texto: '3 — barras comparativas, pizza e linha de evolução mensal' },
        { rotulo: 'Testes', texto: '97 unitários, cobrindo saldo, orçamento e evolução mensal' },
        { rotulo: 'Construção', texto: 'Cerca de 2 semanas, do planejamento aos ajustes finais' }
      ],

      tecnologias: ['Next.js', 'TypeScript', 'Tailwind', 'Supabase', 'Recharts', 'shadcn/ui', 'next-themes'],

      acoes: [
        { rotulo: 'Ver código', href: 'https://github.com/dvzn00/cashflow', externo: true, principal: true },
        { rotulo: 'Baixar relatório de exemplo', href: 'assets/pdf/cashflow-extrato-2026-08.pdf', baixar: true }
      ]
    },

    mealplanner: {
      titulo: 'Meal Planner — Planejador Semanal de Refeições',

      resumo: [
        'Sete dias numa grade de horários livres. As receitas entram arrastadas do painel, ' +
        'e a lista de compras se refaz sozinha somando os ingredientes de tudo que está no ' +
        'plano: 200 g de brócolis em duas receitas viram uma linha de 400 g. Dá para marcar ' +
        'o que já foi ao carrinho, dispensar o que já se tem em casa, copiar um dia ou uma ' +
        'semana inteira, e levar tudo num PDF de duas folhas.',

        'O peso do sistema está no banco, não na tela. A lista de compras é estado derivado, ' +
        'mantido por gatilhos no Postgres; o isolamento entre contas é feito por Row Level ' +
        'Security, com 25 políticas; e as migrações são testadas contra um Postgres de ' +
        'verdade, não contra um dublê.'
      ],

      imagens: [
        {
          src: 'assets/images/mealplanner-semana.png', largura: 1755, altura: 697,
          rotulo: 'Minha semana',
          alt: 'Grade semanal do Meal Planner: sete dias em colunas, cada um com café da manhã, almoço e jantar, e o painel de receitas favoritas acima.',
          legenda: 'A grade dos sete dias: cada horário recebe uma receita arrastada do painel de favoritas.'
        }
      ],

      decisoes: [
        { rotulo: 'Dispensar',
          texto: 'Apagar um item da lista funcionava até o próximo arraste, e o recálculo o ' +
                 'trazia de volta. Remover virou marcar, na coluna ignorado. O on conflict do ' +
                 'recálculo só toca quantidade e data, então as marcas do usuário atravessam ' +
                 'intactas — sem uma linha de código nova.' },
        { rotulo: 'Segurança',
          texto: 'Nove tabelas com Row Level Security e 25 políticas. auth.uid() entra como ' +
                 '(select auth.uid()) para o planejador avaliar uma vez por consulta, não uma ' +
                 'por linha. Se um filtro sumir do front num refactor, o Postgres continua recusando.' },
        { rotulo: 'Testes',
          texto: 'As suítes de RLS e da lista rodam com PGlite — Postgres compilado para ' +
                 'WebAssembly — executando os arquivos de migração de verdade dentro do Vitest. ' +
                 'Um dublê de Supabase testaria a intenção do código; isso testa a política que ' +
                 'o banco aplica.' },
        { rotulo: 'Lista derivada',
          texto: 'generate_shopping_list é uma função PL/pgSQL disparada por gatilhos, que ' +
                 'agrupa por ingrediente e unidade. O usuário recebe grant update apenas nas ' +
                 'colunas comprado e ignorado: privilégio por coluna, então nem pela API dá ' +
                 'para escrever a quantidade somada.' },
        { rotulo: 'Datas',
          texto: 'Toda a aritmética de semana opera sobre texto ISO. new Date("2026-09-07") é ' +
                 'meia-noite em UTC, que em Brasília ainda é dia 6 às 21h — com Date, a semana ' +
                 'viraria um dia antes para metade do país.' },
        { rotulo: 'PDF',
          texto: 'Rota de API com @react-pdf/renderer, declarado em serverExternalPackages ' +
                 'porque tem renderizador próprio e dependências nativas de Node. São duas ' +
                 'folhas separadas de propósito: o cardápio fica em casa e a lista vai ao mercado.' },
        { rotulo: 'Interface',
          texto: '19 Server Actions validadas com Zod, devolvendo resultado tipado em vez de ' +
                 'exceção. A grade usa useOptimistic com useTransition: o arraste aparece na ' +
                 'hora e o servidor desfaz sozinho se a gravação falhar. Nenhum useEffect busca dados.' }
      ],

      numeros: [
        { rotulo: 'Testes', texto: '189 unitários no Vitest e 88 verificações de navegador no Playwright' },
        { rotulo: 'Banco', texto: '9 tabelas, 25 políticas de RLS, 7 funções e 8 gatilhos — 913 linhas de SQL' },
        { rotulo: 'Telas', texto: '10, do login ao histórico de semanas anteriores' },
        { rotulo: 'Server Actions', texto: '19, distribuídas em 6 arquivos' },
        { rotulo: 'Código', texto: 'Cerca de 13.500 linhas de TypeScript e TSX' },
        { rotulo: 'Documentação', texto: '89 decisões de arquitetura registradas, cada uma com o porquê' }
      ],

      tecnologias: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'Supabase',
        'PostgreSQL', 'dnd-kit', 'Zod', '@react-pdf/renderer', 'shadcn/ui', 'Vitest',
        'PGlite', 'Playwright'],

      acoes: [
        { rotulo: 'Visitar site', href: 'https://mealplanner-vzn3.vercel.app/', externo: true, principal: true },
        { rotulo: 'Ver código', href: 'https://github.com/dvzn00/mealplanner', externo: true },
        { rotulo: 'Baixar plano de exemplo', href: 'assets/pdf/meal-planner-exemplo.pdf', baixar: true }
      ]
    }
  };

  var modal = document.getElementById('modal-projeto');
  var gatilhos = document.querySelectorAll('[data-projeto]');

  if (modal && gatilhos.length) {
    var corpoRolavel = modal.querySelector('.modal__corpo');
    var botaoFechar = document.getElementById('modal-fechar');
    var elTitulo = document.getElementById('modal-titulo');
    var elPalco = document.getElementById('galeria-palco');
    var elImagem = document.getElementById('galeria-img');
    var elLegenda = document.getElementById('galeria-legenda');
    var elAbas = document.getElementById('galeria-abas');
    var elDesc = document.getElementById('modal-desc');
    var elDecisoes = document.getElementById('modal-decisoes');
    var elNumeros = document.getElementById('modal-numeros');
    var elChips = document.getElementById('modal-chips');
    var elAcoes = document.getElementById('modal-acoes');
    var aoFundo = document.querySelectorAll('.header, main, .footer, .rail');
    var gatilhoAtivo = null;
    var abas = [];

    var limpar = function (el) { while (el.firstChild) el.removeChild(el.firstChild); };

    // Preenche uma lista rotulo/valor no mesmo formato da ficha tecnica.
    var montarFicha = function (destino, itens) {
      limpar(destino);
      itens.forEach(function (item) {
        var linha = document.createElement('div');
        linha.className = 'ficha__linha';

        var dt = document.createElement('dt');
        dt.textContent = item.rotulo;

        var dd = document.createElement('dd');
        dd.textContent = item.texto;

        linha.appendChild(dt);
        linha.appendChild(dd);
        destino.appendChild(linha);
      });
    };

    var mostrarTela = function (indice, projeto, moverFoco) {
      var imagem = projeto.imagens[indice];

      elImagem.src = imagem.src;
      elImagem.alt = imagem.alt;
      elImagem.width = imagem.largura;
      elImagem.height = imagem.altura;
      elLegenda.textContent = imagem.legenda;
      elPalco.scrollTop = 0;
      elPalco.scrollLeft = 0;

      abas.forEach(function (aba, i) {
        var ativa = i === indice;
        aba.setAttribute('aria-selected', ativa ? 'true' : 'false');
        aba.tabIndex = ativa ? 0 : -1;
        if (ativa) elPalco.setAttribute('aria-labelledby', aba.id);
      });

      if (moverFoco) abas[indice].focus();
    };

    var elGaleria = modal.querySelector('.galeria');

    var montarGaleria = function (projeto) {
      limpar(elAbas);
      abas = [];

      var imagens = projeto.imagens || [];

      // Projeto ainda sem capturas: a galeria inteira sai de cena em vez de
      // aparecer vazia. Basta preencher 'imagens' para ela voltar.
      elGaleria.hidden = imagens.length === 0;
      // Uma miniatura sozinha nao e escolha nenhuma: a fita so aparece com duas ou mais.
      elAbas.hidden = imagens.length < 2;
      if (!imagens.length) return;

      imagens.forEach(function (imagem, indice) {
        var aba = document.createElement('button');
        aba.type = 'button';
        aba.className = 'galeria__aba';
        aba.id = 'galeria-aba-' + indice;
        aba.setAttribute('role', 'tab');
        aba.setAttribute('aria-selected', 'false');
        aba.setAttribute('aria-label', imagem.rotulo);
        aba.tabIndex = -1;

        var mini = document.createElement('img');
        mini.src = imagem.src;
        mini.alt = '';
        mini.loading = 'lazy';
        mini.decoding = 'async';
        aba.appendChild(mini);

        aba.addEventListener('click', function () { mostrarTela(indice, projeto, false); });
        elAbas.appendChild(aba);
        abas.push(aba);
      });

      // Setas, Home e End percorrem as telas, como manda o padrao de abas.
      elAbas.onkeydown = function (evento) {
        var atual = abas.findIndex(function (a) { return a.getAttribute('aria-selected') === 'true'; });
        var destino = null;

        if (evento.key === 'ArrowRight') destino = (atual + 1) % abas.length;
        else if (evento.key === 'ArrowLeft') destino = (atual - 1 + abas.length) % abas.length;
        else if (evento.key === 'Home') destino = 0;
        else if (evento.key === 'End') destino = abas.length - 1;

        if (destino === null) return;
        evento.preventDefault();
        mostrarTela(destino, projeto, true);
      };

      mostrarTela(0, projeto, false);
    };

    var montar = function (projeto) {
      elTitulo.textContent = projeto.titulo;

      limpar(elDesc);
      projeto.resumo.forEach(function (paragrafo) {
        var p = document.createElement('p');
        p.textContent = paragrafo;
        elDesc.appendChild(p);
      });

      montarGaleria(projeto);
      montarFicha(elDecisoes, projeto.decisoes);
      montarFicha(elNumeros, projeto.numeros);

      limpar(elChips);
      projeto.tecnologias.forEach(function (nome) {
        var li = document.createElement('li');
        li.className = 'chip';
        li.textContent = nome;
        elChips.appendChild(li);
      });

      limpar(elAcoes);
      projeto.acoes.forEach(function (acao) {
        var a = document.createElement('a');
        a.className = 'btn ' + (acao.principal ? 'btn--primary' : 'btn--ghost');
        a.href = acao.href;
        a.textContent = acao.rotulo;
        if (acao.externo) { a.target = '_blank'; a.rel = 'noopener'; }
        if (acao.baixar) a.setAttribute('download', '');
        elAcoes.appendChild(a);
      });
    };

    var abrirModal = function (chave, gatilho) {
      var projeto = PROJETOS[chave];
      if (!projeto) return;

      montar(projeto);
      gatilhoAtivo = gatilho;

      modal.removeAttribute('inert');
      modal.classList.add('is-open');
      aoFundo.forEach(function (el) { el.setAttribute('inert', ''); });
      document.body.classList.add('is-locked');

      // Mesmo motivo do menu: so da para focar depois do recalculo de estilo.
      window.requestAnimationFrame(function () { botaoFechar.focus(); });
    };

    var fecharModal = function () {
      modal.classList.remove('is-open');
      modal.setAttribute('inert', '');
      aoFundo.forEach(function (el) { el.removeAttribute('inert'); });
      document.body.classList.remove('is-locked');
      corpoRolavel.scrollTop = 0;

      if (gatilhoAtivo) {
        gatilhoAtivo.focus();
        gatilhoAtivo = null;
      }
    };

    var modalAberto = function () { return modal.classList.contains('is-open'); };

    gatilhos.forEach(function (gatilho) {
      gatilho.addEventListener('click', function () {
        abrirModal(gatilho.getAttribute('data-projeto'), gatilho);
      });
    });

    botaoFechar.addEventListener('click', fecharModal);

    modal.querySelectorAll('[data-fechar-modal]').forEach(function (el) {
      el.addEventListener('click', fecharModal);
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && modalAberto()) fecharModal();
    });
  }


  /* Estado inicial, sem esperar a primeira rolagem. */
  montarTiques();
  despachar();
})();
