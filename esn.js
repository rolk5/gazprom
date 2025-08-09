// esn.optimized.js
// Оптимизированная версия загрузки/рендера для больших JSON-списков.
// Основная идея: сначала рендерим лёгкие "суммарные" карточки,
// полные таблицы строим только по запросу (при раскрытии/нажатии).

(() => {
  'use strict';

  const BATCH_SIZE = 40; // сколько карточек рисуем за одну порцию
  const FETCH_TIMEOUT_MS = 15000;

  const navListEl = document.getElementById('nav-list');
  const contentEl = document.getElementById('content');
  const loaderEl = document.getElementById('loader');
  const errorEl = document.getElementById('error-message');

  const worksMap = new Map();       // id -> work object
  const expanded = new Set();      // id уже с отрисованными деталями

  // Безопасное экранирование текста для вставки в innerHTML
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getWorkId(work) {
    const code = work['Шифр ЭСН'] || work.Работа || Math.random().toString(36).slice(2);
    return 'w-' + String(code).replace(/[^\w\-]/g, '_');
  }

  // fetch с таймаутом
  function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(id));
  }

  async function loadData() {
    try {
      loaderEl.style.display = 'block';
      errorEl.style.display = 'none';

      // берём JSON относительно текущего местоположения (работает на GitHub Pages)
      const jsonUrl = new URL('./esnEnd.json', location.href).href;
      const response = await fetchWithTimeout(jsonUrl);

      if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);

      const data = await response.json();
      const works = data && data.ЭСН ? data.ЭСН : [];

      // build map for quick access
      works.forEach(w => worksMap.set(getWorkId(w), w));

      // быстрый навиг-список (минимально: код + единица)
      renderNav(works);

      // ленивая по-порционная отрисовка суммарных карточек
      renderSummariesInBatches(works);

    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      errorEl.style.display = 'block';
      errorEl.innerHTML = `<h3>Ошибка загрузки данных</h3><p>${escapeHtml(err.message)}</p>`;
    } finally {
      loaderEl.style.display = 'none';
    }
  }

  // render navigation (event delegation)
  function renderNav(works) {
    navListEl.innerHTML = ''; // очистим
    const frag = document.createDocumentFragment();

    for (let work of works) {
      const id = getWorkId(work);
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.dataset.target = id;

      // внутренняя минимальная разметка (без тяжелых таблиц)
      item.innerHTML = `
        <p class="nav-h">${escapeHtml(work['Шифр ЭСН'] || '')}</p>
        <p class="nav-u">${escapeHtml(work.Ед || '')}</p>
        <p class="nav-p">${escapeHtml(work.Работа || '')}</p>
      `;
      frag.appendChild(item);
    }

    navListEl.appendChild(frag);
  }

  // по-порционная отрисовка суммарных карточек
  function renderSummariesInBatches(works) {
    contentEl.innerHTML = ''; // очищаем
    let i = 0;
    const n = works.length;

    const renderChunk = () => {
      const frag = document.createDocumentFragment();
      const end = Math.min(i + BATCH_SIZE, n);
      for (; i < end; i++) {
        const work = works[i];
        const id = getWorkId(work);

        // компактная карточка: заголовок, код, единица, кнопка раскрытия
        const card = document.createElement('article');
        card.className = 'work-card summary';
        card.id = id; // id для scrollIntoView
        card.dataset.workId = id;
        card.innerHTML = `
          <div class="work-header">
            <h2 class="work-title">${escapeHtml(work.Работа)}</h2>
            <div class="work-meta">
              <div class="work-code">${escapeHtml(work['Шифр ЭСН'])}</div>
              <div class="work-unit">${escapeHtml(work.Ед)}</div>
            </div>
          </div>
          <div class="summary-actions">
            <button class="expand-btn" data-action="expand" data-target="${id}">Показать детали</button>
            <button class="goto-btn" data-action="goto" data-target="${id}">Перейти</button>
          </div>
          <div class="details-placeholder" aria-hidden="true"></div>
        `;
        frag.appendChild(card);
      }
      contentEl.appendChild(frag);

      if (i < n) {
        // оставляем браузер "дышать"
        if ('requestIdleCallback' in window) requestIdleCallback(renderChunk);
        else setTimeout(renderChunk, 20);
      }
    };

    renderChunk();
  }

  // Создаёт HTML для таблицы ресурсов (используется при раскрытии)
  function generateResourceTableHTML(resources) {
    if (!resources || resources.length === 0) return '<p>Нет данных для отображения</p>';

    const rows = resources.map(r => `
      <tr>
        <td class="resource-name">${escapeHtml(r.Наименование)}</td>
        <td>${escapeHtml(r['Ед. изм.'] || '-')}</td>
        <td class="resource-value">${escapeHtml(r['Ресурс на ед. изм.'] || '-')}</td>
        <td>${escapeHtml(r.Шифр || '-')}</td>
      </tr>
    `).join('');

    return `
      <table class="resource-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Ед. изм.</th>
            <th>Ресурс</th>
            <th>Шифр</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // При раскрытии карточки строим (единожды) все секции и вставляем в placeholder
  function renderFullDetails(workId) {
    if (expanded.has(workId)) return; // уже готовы

    const work = worksMap.get(workId);
    if (!work) return;

    const card = document.getElementById(workId);
    if (!card) return;

    const placeholder = card.querySelector('.details-placeholder');
    if (!placeholder) return;

    // какие секции показывать
    const resourceSections = ['Трудозатраты', 'Материалы', 'Машины', 'Расход оборудования', 'Капитальный ремонт']
      .filter(s => Array.isArray(work[s]) && work[s].length > 0);

    const parts = resourceSections.map(section => {
      const title = emojiForSection(section) + escapeHtml(section);
      return `<section class="work-section">
                <p class="workTypeHeader">${title}</p>
                <div class="resource-tabs">
                  ${generateResourceTableHTML(work[section])}
                </div>
              </section>`;
    });

    placeholder.innerHTML = parts.join('') || '<p>Нет дополнительных данных</p>';
    placeholder.setAttribute('aria-hidden', 'false');
    expanded.add(workId);
  }

  function emojiForSection(section) {
    const map = {
      "Трудозатраты": "👷 ",
      "Машины": "🏗 ",
      "Материалы": "🔩 ",
      "Расход оборудования": "🚜 ",
      "Капитальный ремонт": "🛠 "
    };
    return map[section] || '';
  }

  // Делаем плавный скролл к карточке и подсвечиваем
  function focusAndHighlight(workId) {
    const el = document.getElementById(workId);
    if (!el) return;
    document.querySelectorAll('.highlight').forEach(x => x.classList.remove('highlight'));
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('highlight');
    // обновим активную навигацию
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.target === workId));
  }

  // обработчик делегирования для nav-list и content
  function setupDelegation() {
    // навигация: клик по .nav-item
    navListEl.addEventListener('click', e => {
      const item = e.target.closest('.nav-item');
      if (!item) return;
      const targetId = item.dataset.target;
      if (!targetId) return;
      // при переходе в контент, сначала убедимся, что детали отрисованы (лениво)
      renderFullDetails(targetId);
      focusAndHighlight(targetId);
    });

    // content: обработка кнопок в карточках
    contentEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const targetId = btn.dataset.target;
      if (!targetId) return;

      if (action === 'expand') {
        // если ещё не отрисовали — отрисовать, иначе свернуть (toggle)
        const card = document.getElementById(targetId);
        if (!card) return;
        const ph = card.querySelector('.details-placeholder');
        if (!ph) return;

        if (expanded.has(targetId)) {
          // свернуть
          ph.innerHTML = '';
          ph.setAttribute('aria-hidden', 'true');
          expanded.delete(targetId);
          btn.textContent = 'Показать детали';
        } else {
          renderFullDetails(targetId);
          btn.textContent = 'Свернуть';
          focusAndHighlight(targetId);
        }
      } else if (action === 'goto') {
        renderFullDetails(targetId);
        focusAndHighlight(targetId);
      }
    });
  }

  // Экспортим глобальную функцию, если надо программно перейти
  window.scrollToWork = function (anchor) {
    
    let workId = anchor;
    // если передали код, а не id, преобразуем
    if (!workId.startsWith('w-')) {
      // ищем в map
      for (let [id, w] of worksMap.entries()) {
        if (String(w['Шифр ЭСН']) === String(anchor)) {
          workId = id;
          break;
        }
      }
    }
    // отрисуем детали и проскроллим
    renderFullDetails(workId);
    focusAndHighlight(workId);
  };

  // Инициализация
  document.addEventListener('DOMContentLoaded', () => {
    setupDelegation();
    loadData();
  });

})();