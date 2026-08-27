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


  /* Estado inicial, sem esperar a primeira rolagem. */
  montarTiques();
  despachar();
})();
