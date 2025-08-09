async function loadData() {
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    loader.style.display = 'block';
    errorMessage.style.display = 'none';


    const jsonUrl = 'https://rolk5.github.io/gazprom/esnEnd.json';

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут

        const response = await fetch(jsonUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        loader.style.display = 'none';

        generateNavigation(data.ЭСН);
        generateContent(data.ЭСН);

    } catch (error) {
        loader.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = `
            <h3>Ошибка загрузки данных</h3>
            <p>${error.message}</p>
            <p>Проверьте подключение к интернету или попробуйте обновить страницу.</p>
        `;
        console.error('Ошибка загрузки данных:', error);
    }
}

function generateNavigation(works) {
    let navHTML = works.map(work => `
        <div class="nav-item" 
             data-target="${work['Шифр ЭСН']}" 
             onclick="scrollToWork('${work['Шифр ЭСН']}')">
            <p class="nav-h">${work['Шифр ЭСН']}</p>
            <p class="nav-u">${work['Ед']}</p>
            <p class="nav-p">${work.Работа}</p>
        </div>
    `).join('');
    document.getElementById('nav-list').innerHTML = navHTML;
}

function generateContent(works) {
    let contentHTML = works.map(work => {
        const resourceSections = [
            'Трудозатраты', 'Материалы', 'Машины',
            'Расход оборудования', 'Капитальный ремонт'
        ].filter(section => work[section]?.length > 0);

        let tabContentHTML = resourceSections.map(section => `
            <p class="workTypeHeader">${emojyAdd(section)}</p>    
            <div class="resource-tabs">
              ${generateResourceTable(work[section])}
            </div>
        `).join('');

        return `
            <div id="${work['Шифр ЭСН']}" class="work-card">
                <div class="work-header">
                    <h2 class="work-title">${work.Работа}</h2>
                    <div class="work-meta">
                        <div class="work-code">${work['Шифр ЭСН']}</div>
                        <div class="work-unit">${work.Ед}</div>
                    </div>
                </div>
                ${tabContentHTML}
            </div>
        `;
    }).join('');
    document.getElementById('content').innerHTML = contentHTML;
}

function emojyAdd(section) {
    const emojiMap = {
        "Трудозатраты": "👷Трудозатраты",
        "Машины": "🏗Машины",
        "Материалы": "🔩Материалы",
        "Расход оборудования": "🚜Расход оборудования",
        "Капитальный ремонт": "🛠Капитальный ремонт"
    };
    return emojiMap[section] || section;
}

function generateResourceTable(resources) {
    if (!resources || resources.length === 0) {
        return '<p>Нет данных для отображения</p>';
    }
    let rowsHTML = resources.map(resource => `
        <tr>
            <td class="resource-name">${resource.Наименование}</td>
            <td>${resource['Ед. изм.'] || '-'}</td>
            <td class="resource-value">${resource['Ресурс на ед. изм.']}</td>
            <td>${resource.Шифр || '-'}</td>
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
            <tbody>${rowsHTML}</tbody>
        </table>
    `;
}

function scrollToWork(anchor) {
    const element = document.getElementById(anchor);
    if (element) {
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('highlight');
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.nav-item[data-target="${anchor}"]`).classList.add('active');
    }
}

window.scrollToWork = scrollToWork;
document.addEventListener('DOMContentLoaded', loadData);