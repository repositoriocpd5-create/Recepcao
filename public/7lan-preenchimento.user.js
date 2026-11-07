// ==UserScript==
// @name         SMEDU CCO → 7LAN: preenchimento do novo ticket
// @namespace    https://sme.itaguai.rj.gov.br/cco
// @version      1.0.0
// @description  Preenche Título, Descrição e Mesa de serviço do novo ticket da 7LAN com os dados da ocorrência de câmera do CCO. Não salva o ticket: o administrador confere e clica em Salvar.
// @match        https://ticket.7lan.com.br/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var CHAVE = 'sme-cco-ticket-pendente';
  var VALIDADE_MS = 15 * 60 * 1000;

  var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var aguardar = async function (fn, limite) {
    var fim = Date.now() + (limite || 10000);
    while (Date.now() < fim) {
      var v = fn();
      if (v) return v;
      await esperar(150);
    }
    return null;
  };

  // Aviso na tela
  var aviso = function (texto, erro) {
    var el = document.getElementById('sme-cco-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sme-cco-aviso';
      el.style.cssText = 'position:fixed;right:16px;bottom:72px;z-index:99999;max-width:360px;padding:12px 14px;border-radius:10px;font:600 13px/1.4 system-ui,sans-serif;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35)';
      document.body.appendChild(el);
    }
    el.style.background = erro ? '#b42318' : '#0b63ce';
    el.textContent = texto;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.remove(); }, erro ? 20000 : 9000);
  };

  // 1) Guarda os dados que chegam no fragmento da URL (#sme=...); sobrevivem ao login.
  var lerHash = function () {
    var m = /[#&]sme=([^&]+)/.exec(location.hash);
    if (!m) return;
    try {
      var dados = JSON.parse(decodeURIComponent(m[1]));
      if (dados && dados.titulo) {
        localStorage.setItem(CHAVE, JSON.stringify({ dados: dados, em: Date.now() }));
      }
    } catch (e) { /* hash inválido */ }
    history.replaceState(null, '', location.pathname + location.search);
  };

  var pendente = function () {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (!bruto) return null;
      var p = JSON.parse(bruto);
      if (!p || Date.now() - p.em > VALIDADE_MS) { localStorage.removeItem(CHAVE); return null; }
      return p.dados;
    } catch (e) { return null; }
  };

  // 2) Utilitários de preenchimento
  var escapar = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var paraHtml = function (texto) {
    return String(texto).split(/\n/).map(function (l) { return '<p>' + (escapar(l) || '<br>') + '</p>'; }).join('');
  };

  var itemDoRotulo = function (inicio) {
    var rotulos = document.querySelectorAll('label');
    for (var i = 0; i < rotulos.length; i++) {
      var t = (rotulos[i].textContent || '').trim().toLowerCase();
      if (t.indexOf(inicio.toLowerCase()) === 0) {
        return rotulos[i].closest('.ant-form-item') || rotulos[i].parentElement;
      }
    }
    return null;
  };

  var definirValor = function (input, valor) {
    var proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  var preencherTitulo = async function (titulo) {
    var input = await aguardar(function () {
      var item = itemDoRotulo('Título');
      return item && item.querySelector('input[type="text"], input:not([type])');
    });
    if (!input) throw new Error('campo Título não encontrado');
    input.focus();
    definirValor(input, titulo);
  };

  var preencherDescricao = async function (texto) {
    var html = paraHtml(texto);
    var item = await aguardar(function () { return itemDoRotulo('Descrição'); });
    if (!item) throw new Error('campo Descrição não encontrado');
    // Editor TinyMCE (página principal)
    var ok = await aguardar(function () {
      if (window.tinymce && window.tinymce.activeEditor) {
        window.tinymce.activeEditor.setContent(html);
        return true;
      }
      return false;
    }, 3000);
    if (ok) return;
    // Editor em iframe
    var frame = document.querySelector('iframe');
    if (frame && frame.contentDocument && frame.contentDocument.body && frame.contentDocument.body.isContentEditable) {
      frame.contentDocument.body.innerHTML = html;
      frame.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    // Editor contenteditable (Quill, Tiptap, etc.)
    var area = await aguardar(function () {
      return document.querySelector('[contenteditable="true"]');
    }, 6000);
    if (!area) throw new Error('editor da Descrição não encontrado');
    area.focus();
    document.execCommand('selectAll', false, null);
    if (!document.execCommand('insertHTML', false, html)) {
      area.innerHTML = html;
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  var selecionarOpcao = async function (rotulo, nome) {
    var item = await aguardar(function () { return itemDoRotulo(rotulo); });
    if (!item) throw new Error('campo ' + rotulo + ' não encontrado');
    var seletor = item.querySelector('.ant-select-selector') || item.querySelector('.ant-select');
    if (!seletor) throw new Error('lista ' + rotulo + ' não encontrada');
    seletor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    var busca = item.querySelector('.ant-select-selection-search-input');
    if (busca) definirValor(busca, nome);
    var opcao = await aguardar(function () {
      var opcoes = document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
      for (var i = 0; i < opcoes.length; i++) {
        var linha = (opcoes[i].textContent || '').trim();
        if (linha.toLowerCase().indexOf(nome.toLowerCase()) === 0) return opcoes[i];
      }
      return null;
    }, 6000);
    if (!opcao) throw new Error('opção "' + nome + '" não encontrada em ' + rotulo);
    opcao.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  // 3) Execução
  var rodar = async function () {
    lerHash();
    var dados = pendente();
    if (!dados) return;
    if (!/\/tickets\/new/.test(location.pathname)) return; // após o login, volta para o novo ticket
    var falhas = [];
    var tentar = async function (nome, fn) {
      try { await fn(); } catch (e) { falhas.push(nome + ' (' + e.message + ')'); }
    };
    aviso('SMEDU CCO: preenchendo o ticket…');
    if (dados.mesa) await tentar('Mesa de serviço', function () { return selecionarOpcao('Mesa de serviço', dados.mesa); });
    if (dados.catalogo) await tentar('Catálogo de serviços', function () { return selecionarOpcao('Catálogo de serviços', dados.catalogo); });
    await tentar('Título', function () { return preencherTitulo(dados.titulo); });
    await tentar('Descrição', function () { return preencherDescricao(dados.descricao || ''); });
    localStorage.removeItem(CHAVE);
    if (falhas.length) {
      aviso('SMEDU CCO: preencha à mão: ' + falhas.join('; ') + '. O texto completo também está na área de transferência.', true);
    } else {
      aviso('SMEDU CCO: ticket preenchido. Escolha o Catálogo de serviços, confira e clique em Salvar. Depois informe o número no CCO.');
    }
  };

  rodar();
  // O site é uma SPA: se o usuário chegar em /tickets/new depois (após o login), tenta de novo.
  var ultimo = location.href;
  setInterval(function () {
    if (location.href !== ultimo) { ultimo = location.href; rodar(); }
  }, 800);
})();
