
        async function loadData() {
            try {

                document.getElementById('loader').style.display = 'block';
                document.getElementById('error-message').style.display = 'none';
                

                const response = await fetch('esnEnd.json');
                

                if (!response.ok) {
                    throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
                }
                

                const data = await response.json();
                

                document.getElementById('loader').style.display = 'none';
                

                generateNavigation(data.ЭСН);
                generateContent(data.ЭСН);
                

                if (data.ЭСН.length > 0) {
                    const firstCode = data.ЭСН[0]['Шифр ЭСН'].replace(/[.-]/g, '-');
                    document.querySelector(`.nav-item[data-target="${firstCode}"]`).classList.add('active');
                    

                    setTimeout(() => scrollToWork(firstCode), 300);
                }
                
            } catch (error) {
               
                document.getElementById('loader').style.display = 'none';
                const errorMessage = document.getElementById('error-message');
                errorMessage.style.display = 'block';
                errorMessage.innerHTML = `
                    <h3>Ошибка загрузки данных</h3>
                    <p>${error.message}</p>
                    <p>Проверьте:</p>
                    <ul>
                        <li>Файл data.json существует в той же папке</li>
                        <li>Файл содержит валидные JSON-данные</li>
                        <li>Формат данных соответствует ожидаемому</li>
                        <li>Сервер разрешает доступ к файлу</li>
                    </ul>
                `;
                console.error('Ошибка загрузки данных:', error);
            }
        }
        

        function generateNavigation(works) {
            let navHTML = '';

            
            
            works.forEach(work => {

                const anchor = work['Шифр ЭСН'];


                navHTML += `
                    <div class="nav-item" 
                         data-target="${anchor}" 
                         onclick="scrollToWork('${anchor}')">
                        <p class = "nav-h">${work['Шифр ЭСН']}</p>
                        <p class = "nav-u">${work['Ед']}</p>
                        <p class = "nav-p">${work.Работа}</p>
                    </div>
                `;
            });
            

            document.getElementById('nav-list').innerHTML = navHTML;
        }
        

        function generateContent(works) {
            let contentHTML = '';
            
            works.forEach(work => {

                const anchor = work['Шифр ЭСН'];
                

                const resourceSections = [
                    'Трудозатраты', 'Материалы', 'Машины', 
                    'Расход оборудования', 'Капитальный ремонт'
                ].filter(section => work[section] && work[section].length > 0);
                

                let tabsHTML = '';
                let tabContentHTML = '';



                
                resourceSections.forEach((section, index) => {


                function emojyAdd (section) {
                  if (section == "Трудозатраты") {
                    return section ="👷Трудозатраты"
                  } 
                  else if (section == "Машины") {
                    return section = "🏗Машины"
                  }
                  else if (section == "Материалы") {
                    return section = "🔩Материалы"
                  }
                  else if (section == "Расход оборудования") {
                    return section = "🚜Расход оборудования"
                  }
                  else if (section == "Капитальный ремонт") {
                    return section = "🛠Капитальный ремонт"
                  }
                };


                    tabContentHTML += `
                    <p class = "workTypeHeader">${emojyAdd(section)}</p>    
                    <div class="resource-tabs">
                      ${generateResourceTable(work[section])}
                    </div>
                    `;
                });


                

                contentHTML += `
                    <div id="${anchor}" class="work-card">
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
            });
            

            document.getElementById('content').innerHTML = contentHTML;
        }
        

        function generateResourceTable(resources) {

            if (!resources || resources.length === 0) {
                return '<p>Нет данных для отображения</p>';
            }
            

            let rowsHTML = '';
            resources.forEach(resource => {
                rowsHTML += `
                    <tr>
                        <td class="resource-name">${resource.Наименование}</td>
                        <td>${resource['Ед. изм.'] || '-'}</td>
                        <td class="resource-value">${resource['Ресурс на ед. изм.']}</td>
                        <td>${resource.Шифр || '-'}</td>
                    </tr>
                `;
            });
            

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
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            `;
        }
        

        function switchTab(button, tabId) {

            const tabsContainer = button.closest('.resource-tabs');
            

            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            

            button.classList.add('active');
            

            const contentContainer = tabsContainer.nextElementSibling;
            

            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            

            document.getElementById(tabId).classList.add('active');
        }
        

        function scrollToWork(anchor) {
            const element = document.getElementById(anchor);
            if (element) {

                document.querySelectorAll('.highlight').forEach(el => {
                    el.classList.remove('highlight');
                });
                

                element.scrollIntoView({behavior: 'smooth', block: 'start'});
                
 
                element.classList.add('highlight');
                

                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelector(`.nav-item[data-target="${anchor}"]`).classList.add('active');
            }
        }
        

        window.switchTab = switchTab;
        window.scrollToWork = scrollToWork;
        

        document.addEventListener('DOMContentLoaded', loadData);
