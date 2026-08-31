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

    var montarGaleria = function (projeto) {
      limpar(elAbas);
      abas = [];

      projeto.imagens.forEach(function (imagem, indice) {
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
