function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('date').textContent = now.toLocaleDateString('pt-PT', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });
}
setInterval(updateClock, 1000);
updateClock();

async function fetchSystemStats() {
    const cpuProgress = document.getElementById('cpu-usage');
    const ramProgress = document.getElementById('ram-usage');
    const cpuText = document.getElementById('cpu-usage-text');
    const ramText = document.getElementById('ram-usage-text');
    const message = document.getElementById('system-stats-message');

    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error(`Falha no pedido de estado do servidor: ${response.status}`);

        const stats = await response.json();
        const cpu = Number(stats.cpu);
        const ram = Number(stats.ram);
        if (![cpu, ram].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) {
            throw new Error('Dados de utilização do servidor inválidos');
        }

        cpuProgress.value = cpu;
        ramProgress.value = ram;
        cpuText.textContent = `${cpu.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
        ramText.textContent = `${ram.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
        message.textContent = '';
    } catch {
        cpuText.textContent = '—';
        ramText.textContent = '—';
        message.textContent = 'Não foi possível obter os dados do servidor.';
    }
}
fetchSystemStats();
setInterval(fetchSystemStats, 10000);

const weatherDescriptions = {
    0: ['Céu limpo', '☀️'],
    1: ['Pouco nublado', '🌤️'],
    2: ['Parcialmente nublado', '⛅'],
    3: ['Nublado', '☁️'],
    45: ['Nevoeiro', '🌫️'],
    48: ['Nevoeiro gelado', '🌫️'],
    51: ['Chuviscos fracos', '🌦️'],
    53: ['Chuviscos', '🌦️'],
    55: ['Chuviscos fortes', '🌧️'],
    56: ['Chuviscos gelados', '🌧️'],
    57: ['Chuviscos gelados', '🌧️'],
    61: ['Chuva fraca', '🌦️'],
    63: ['Chuva', '🌧️'],
    65: ['Chuva forte', '🌧️'],
    66: ['Chuva gelada', '🌧️'],
    67: ['Chuva gelada forte', '🌧️'],
    71: ['Queda de neve fraca', '🌨️'],
    73: ['Queda de neve', '🌨️'],
    75: ['Queda de neve forte', '❄️'],
    77: ['Grãos de neve', '❄️'],
    80: ['Aguaceiros fracos', '🌦️'],
    81: ['Aguaceiros', '🌧️'],
    82: ['Aguaceiros fortes', '🌧️'],
    85: ['Aguaceiros de neve', '🌨️'],
    86: ['Aguaceiros fortes de neve', '❄️'],
    95: ['Trovoada', '⛈️'],
    96: ['Trovoada com granizo', '⛈️'],
    99: ['Trovoada com granizo', '⛈️']
};

function getWeatherDescription(code) {
    return weatherDescriptions[code] || ['Desconhecido', '🌡️'];
}

async function fetchWeather() {
    const forecast = document.getElementById('weather-forecast');
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=41.1579&longitude=-8.6291&current=temperature_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=Europe%2FLisbon';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha no pedido meteorológico: ${response.status}`);

        const data = await response.json();
        if (!data.current || !data.daily) throw new Error('Dados meteorológicos indisponíveis');

        const [description, icon] = getWeatherDescription(data.current.weather_code);
        document.getElementById('weather-temp').textContent = `${Math.round(data.current.temperature_2m)}°C`;
        document.getElementById('weather-desc').textContent =
            `${icon} ${description} · Vento: ${data.current.wind_speed_10m} km/h`;

        forecast.replaceChildren();
        data.daily.time.forEach((date, index) => {
            const [dayDescription, dayIcon] = getWeatherDescription(data.daily.weather_code[index]);
            const day = document.createElement('div');
            day.className = 'forecast-day';

            const dayName = document.createElement('span');
            dayName.className = 'forecast-name';
            dayName.textContent = new Date(`${date}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'short' });

            const dayWeather = document.createElement('span');
            dayWeather.className = 'forecast-icon';
            dayWeather.textContent = dayIcon;
            dayWeather.setAttribute('aria-label', dayDescription);
            dayWeather.title = dayDescription;

            const temperatures = document.createElement('span');
            temperatures.className = 'forecast-temperatures';
            temperatures.textContent =
                `${Math.round(data.daily.temperature_2m_max[index])}° / ${Math.round(data.daily.temperature_2m_min[index])}°`;

            day.append(dayName, dayWeather, temperatures);
            forecast.appendChild(day);
        });
    } catch {
        document.getElementById('weather-temp').textContent = '--°C';
        document.getElementById('weather-desc').textContent = 'Meteorologia indisponível';
        forecast.replaceChildren();
    }
}
fetchWeather();
setInterval(fetchWeather, 600000);

const defaultQuickLinks = [
    { name: 'GitHub', url: 'https://github.com/' },
    { name: 'YouTube', url: 'https://youtube.com/' },
    { name: 'Calendário', url: 'https://calendar.google.com/' },
    { name: 'Gmail', url: 'https://mail.google.com/' }
];

function normalizeQuickLink(link) {
    if (!link || typeof link.name !== 'string' || typeof link.url !== 'string') return null;
    try {
        const site = new URL(link.url);
        if (site.protocol !== 'http:' && site.protocol !== 'https:') return null;
        const name = link.name.trim();
        return {
            name: name === 'Calendar' && site.hostname === 'calendar.google.com'
                ? 'Calendário'
                : name || site.hostname.replace(/^www\./, ''),
            url: site.href
        };
    } catch {
        return null;
    }
}

const storedLinks = readStorage('dash_quick_links', null);
let quickLinks = Array.isArray(storedLinks)
    ? storedLinks.map(normalizeQuickLink).filter(link => link !== null)
    : defaultQuickLinks.slice();

const quickLinksList = document.getElementById('quick-links');
const manageLinksList = document.getElementById('quick-link-manage-list');
const quickLinksDialog = document.getElementById('quick-links-menu');
const quickLinksMenuButton = document.getElementById('quick-links-menu-button');
const quickLinkMessage = document.getElementById('quick-link-message');
const quickLinkForm = document.getElementById('quick-link-form');
const quickLinkUrlInput = document.getElementById('quick-link-url');
const quickLinkNameInput = document.getElementById('quick-link-name');
const quickLinkEditIndex = document.getElementById('quick-link-edit-index');
const quickLinkSubmitButton = document.getElementById('quick-link-submit');
const cancelQuickLinkEditButton = document.getElementById('quick-link-cancel-edit');

function saveQuickLinks() {
    try {
        localStorage.setItem('dash_quick_links', JSON.stringify(quickLinks));
        return true;
    } catch {
        quickLinkMessage.textContent = 'Não foi possível guardar esta alteração no navegador.';
        return false;
    }
}

function renderQuickLinks() {
    quickLinksList.replaceChildren();
    manageLinksList.replaceChildren();

    quickLinks.forEach((link, index) => {
        const site = new URL(link.url);
        const anchor = document.createElement('a');
        anchor.href = site.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';

        const icon = document.createElement('img');
        icon.className = 'site-icon';
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');
        icon.src = `${site.origin}/favicon.ico`;
        icon.onerror = () => {
            if (icon.dataset.fallback) {
                icon.remove();
                return;
            }
            icon.dataset.fallback = 'true';
            icon.src = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(site.origin)}&sz=64`;
        };

        const label = document.createElement('span');
        label.textContent = link.name;
        anchor.append(icon, label);
        quickLinksList.appendChild(anchor);

        const manageItem = document.createElement('li');
        const manageName = document.createElement('span');
        manageName.textContent = link.name;
        const actions = document.createElement('div');
        actions.className = 'quick-link-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => {
            quickLinkEditIndex.value = String(index);
            quickLinkUrlInput.value = link.url;
            quickLinkNameInput.value = link.name;
            quickLinkSubmitButton.textContent = 'Guardar alterações';
            cancelQuickLinkEditButton.hidden = false;
            quickLinkMessage.textContent = '';
            quickLinkUrlInput.focus();
        });

        const upButton = document.createElement('button');
        upButton.type = 'button';
        upButton.textContent = '↑';
        upButton.setAttribute('aria-label', `Mover ${link.name} para cima`);
        upButton.disabled = index === 0;
        upButton.addEventListener('click', () => moveQuickLink(index, -1));

        const downButton = document.createElement('button');
        downButton.type = 'button';
        downButton.textContent = '↓';
        downButton.setAttribute('aria-label', `Mover ${link.name} para baixo`);
        downButton.disabled = index === quickLinks.length - 1;
        downButton.addEventListener('click', () => moveQuickLink(index, 1));

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = 'Remover';
        removeButton.setAttribute('aria-label', `Remover ${link.name}`);
        removeButton.addEventListener('click', () => {
            const previousLinks = quickLinks.slice();
            quickLinks.splice(index, 1);
            if (saveQuickLinks()) {
                renderQuickLinks();
                quickLinkMessage.textContent = 'Ligação removida.';
            } else {
                quickLinks = previousLinks;
            }
        });

        actions.append(editButton, upButton, downButton, removeButton);
        manageItem.append(manageName, actions);
        manageLinksList.appendChild(manageItem);
    });
}

function moveQuickLink(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= quickLinks.length) return;

    const previousLinks = quickLinks.slice();
    [quickLinks[index], quickLinks[targetIndex]] = [quickLinks[targetIndex], quickLinks[index]];
    if (saveQuickLinks()) {
        renderQuickLinks();
    } else {
        quickLinks = previousLinks;
    }
}

function resetQuickLinkForm() {
    quickLinkForm.reset();
    quickLinkEditIndex.value = '';
    quickLinkSubmitButton.textContent = 'Adicionar ligação';
    cancelQuickLinkEditButton.hidden = true;
}

quickLinksMenuButton.addEventListener('click', () => {
    if (quickLinksDialog.open) {
        quickLinksDialog.close();
    } else {
        quickLinksDialog.showModal();
        quickLinksMenuButton.setAttribute('aria-expanded', 'true');
    }
});

document.getElementById('quick-links-close-button').addEventListener('click', () => {
    quickLinksDialog.close();
});

quickLinksDialog.addEventListener('close', () => {
    quickLinksMenuButton.setAttribute('aria-expanded', 'false');
});

quickLinksDialog.addEventListener('click', event => {
    if (event.target === quickLinksDialog) quickLinksDialog.close();
});

cancelQuickLinkEditButton.addEventListener('click', () => {
    resetQuickLinkForm();
    quickLinkMessage.textContent = '';
});

quickLinkForm.addEventListener('submit', event => {
    event.preventDefault();
    const rawUrl = quickLinkUrlInput.value.trim();
    const normalizedUrl = /^[a-z][a-z\d+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const quickLink = normalizeQuickLink({
        name: quickLinkNameInput.value.trim(),
        url: normalizedUrl
    });

    if (!quickLink) {
        quickLinkMessage.textContent = 'Introduza um endereço de site HTTP ou HTTPS válido.';
        return;
    }

    const previousLinks = quickLinks.slice();
    const editingIndex = quickLinkEditIndex.value;
    if (editingIndex === '') {
        quickLinks.push(quickLink);
    } else {
        quickLinks[Number(editingIndex)] = quickLink;
    }

    if (!saveQuickLinks()) {
        quickLinks = previousLinks;
        return;
    }

    renderQuickLinks();
    quickLinkMessage.textContent = editingIndex === '' ? 'Ligação adicionada.' : 'Ligação atualizada.';
    resetQuickLinkForm();
});

renderQuickLinks();

const taskMessage = document.getElementById('task-message');
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const taskDueDateInput = document.getElementById('task-due-date');
const taskPriorityInput = document.getElementById('task-priority');
const validPriorities = ['low', 'medium', 'high'];
const savedTasks = readStorage('dash_tasks', []);
let tasks = Array.isArray(savedTasks)
    ? savedTasks.filter(task => task && typeof task.text === 'string').map(task => ({
        text: task.text,
        done: Boolean(task.done),
        dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
        priority: validPriorities.includes(task.priority) ? task.priority : 'medium'
    }))
    : [];

function saveTasks() {
    try {
        localStorage.setItem('dash_tasks', JSON.stringify(tasks));
        return true;
    } catch {
        taskMessage.textContent = 'Não foi possível guardar as tarefas no navegador.';
        return false;
    }
}

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function sortTasks() {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    tasks = tasks
        .map((task, index) => ({ task, index }))
        .sort((left, right) => {
            const priorityDifference = priorityRank[right.task.priority] - priorityRank[left.task.priority];
            if (priorityDifference) return priorityDifference;

            const leftDate = left.task.dueDate || '9999-12-31';
            const rightDate = right.task.dueDate || '9999-12-31';
            return leftDate.localeCompare(rightDate) || left.index - right.index;
        })
        .map(entry => entry.task);
}

sortTasks();

function renderTasks() {
    taskList.replaceChildren();
    const today = getLocalDateString();

    tasks.forEach((task, index) => {
        const item = document.createElement('li');
        item.className = 'task-item';
        item.classList.toggle('done', task.done);
        const overdue = Boolean(task.dueDate && task.dueDate < today && !task.done);
        item.classList.toggle('overdue', overdue);

        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';

        const completeButton = document.createElement('button');
        completeButton.type = 'button';
        completeButton.className = 'task-complete-button';
        completeButton.textContent = task.done ? '✓' : '○';
        completeButton.setAttribute('aria-label', task.done ? `Reativar a tarefa ${task.text}` : `Concluir a tarefa ${task.text}`);
        completeButton.addEventListener('click', () => toggleTask(index));

        const taskDescription = document.createElement('div');
        taskDescription.className = 'task-description';
        const taskName = document.createElement('span');
        taskName.className = 'task-name';
        taskName.textContent = task.text;
        taskDescription.appendChild(taskName);

        if (task.dueDate) {
            const dueDate = document.createElement('span');
            dueDate.className = 'task-due-date';
            const date = new Date(`${task.dueDate}T12:00:00`);
            dueDate.textContent = `Prazo: ${date.toLocaleDateString('pt-PT')}`;
            if (overdue) dueDate.textContent += ' · Em atraso';
            taskDescription.appendChild(dueDate);
        }

        const priority = document.createElement('span');
        priority.className = `priority-badge priority-${task.priority}`;
        const priorityNames = { low: 'Baixa', medium: 'Média', high: 'Alta' };
        priority.textContent = `Prioridade ${priorityNames[task.priority]}`;

        taskDetails.append(completeButton, taskDescription);
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        taskActions.appendChild(priority);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'task-delete-button';
        deleteButton.textContent = '×';
        deleteButton.setAttribute('aria-label', `Eliminar a tarefa ${task.text}`);
        deleteButton.addEventListener('click', () => deleteTask(index));
        taskActions.appendChild(deleteButton);

        item.append(taskDetails, taskActions);
        taskList.appendChild(item);
    });
}

function toggleTask(index) {
    const previousDone = tasks[index].done;
    tasks[index].done = !previousDone;
    if (saveTasks()) {
        renderTasks();
    } else {
        tasks[index].done = previousDone;
    }
}

function deleteTask(index) {
    const removedTask = tasks.splice(index, 1)[0];
    if (saveTasks()) {
        renderTasks();
    } else {
        tasks.splice(index, 0, removedTask);
    }
}

document.getElementById('task-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    const previousTasks = tasks.slice();
    tasks.push({
        text,
        done: false,
        dueDate: taskDueDateInput.value,
        priority: taskPriorityInput.value
    });
    sortTasks();

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    event.currentTarget.reset();
    taskPriorityInput.value = 'medium';
    taskMessage.textContent = '';
    renderTasks();
});

renderTasks();

const widgetNames = {
    clock: 'Hora local',
    system: 'Estado do servidor',
    weather: 'Meteorologia',
    'quick-links': 'Acesso rápido',
    tasks: 'Tarefas'
};
const widgetIds = Object.keys(widgetNames);
const storedWidgetSettingsValue = readStorage('dash_widget_settings', {});
const storedWidgetSettings = storedWidgetSettingsValue && typeof storedWidgetSettingsValue === 'object'
    ? storedWidgetSettingsValue
    : {};
const widgetSettings = {
    hidden: Array.isArray(storedWidgetSettings.hidden)
        ? storedWidgetSettings.hidden.filter(id => widgetIds.includes(id))
        : [],
    order: Array.isArray(storedWidgetSettings.order)
        ? [...new Set(storedWidgetSettings.order.filter(id => widgetIds.includes(id))), ...widgetIds.filter(id => !storedWidgetSettings.order.includes(id))]
        : widgetIds.slice()
};

function saveWidgetSettings() {
    try {
        localStorage.setItem('dash_widget_settings', JSON.stringify(widgetSettings));
        return true;
    } catch {
        document.getElementById('settings-message').textContent = 'Não foi possível guardar as definições do painel.';
        return false;
    }
}

function applyWidgetSettings() {
    const grid = document.querySelector('.grid');
    const cards = new Map(Array.from(grid.querySelectorAll('[data-widget]'))
        .map(card => [card.dataset.widget, card]));

    widgetSettings.order.forEach(id => {
        const card = cards.get(id);
        if (!card) return;
        card.hidden = widgetSettings.hidden.includes(id);
        grid.appendChild(card);
    });
}

function renderWidgetSettings() {
    const list = document.getElementById('widget-settings-list');
    list.replaceChildren();

    widgetSettings.order.forEach((id, index) => {
        const item = document.createElement('li');
        const label = document.createElement('label');
        label.className = 'widget-visibility-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !widgetSettings.hidden.includes(id);
        checkbox.addEventListener('change', () => {
            const previousHidden = widgetSettings.hidden.slice();
            widgetSettings.hidden = checkbox.checked
                ? widgetSettings.hidden.filter(hiddenId => hiddenId !== id)
                : [...widgetSettings.hidden, id];
            if (saveWidgetSettings()) {
                applyWidgetSettings();
            } else {
                widgetSettings.hidden = previousHidden;
                checkbox.checked = !widgetSettings.hidden.includes(id);
            }
        });
        label.append(checkbox, document.createTextNode(widgetNames[id]));

        const actions = document.createElement('div');
        actions.className = 'widget-order-actions';
        const upButton = document.createElement('button');
        upButton.type = 'button';
        upButton.textContent = '↑';
        upButton.setAttribute('aria-label', `Mover ${widgetNames[id]} para cima`);
        upButton.disabled = index === 0;
        upButton.addEventListener('click', () => moveWidget(id, -1));
        const downButton = document.createElement('button');
        downButton.type = 'button';
        downButton.textContent = '↓';
        downButton.setAttribute('aria-label', `Mover ${widgetNames[id]} para baixo`);
        downButton.disabled = index === widgetSettings.order.length - 1;
        downButton.addEventListener('click', () => moveWidget(id, 1));
        actions.append(upButton, downButton);

        item.append(label, actions);
        list.appendChild(item);
    });
}

function moveWidget(id, direction) {
    const index = widgetSettings.order.indexOf(id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= widgetSettings.order.length) return;

    const previousOrder = widgetSettings.order.slice();
    [widgetSettings.order[index], widgetSettings.order[targetIndex]] =
        [widgetSettings.order[targetIndex], widgetSettings.order[index]];
    if (saveWidgetSettings()) {
        applyWidgetSettings();
        renderWidgetSettings();
    } else {
        widgetSettings.order = previousOrder;
    }
}

const settingsDialog = document.getElementById('settings-dialog');
const settingsButton = document.getElementById('settings-button');
const settingsMessage = document.getElementById('settings-message');
const themeSelect = document.getElementById('theme-select');
const accentColorInput = document.getElementById('accent-color');
const appearanceValue = readStorage('dash_appearance', {});
const appearance = appearanceValue && typeof appearanceValue === 'object' ? appearanceValue : {};
const appearanceSettings = {
    theme: appearance.theme === 'light' ? 'light' : 'dark',
    accent: typeof appearance.accent === 'string' && /^#[\da-f]{6}$/i.test(appearance.accent)
        ? appearance.accent
        : '#3b82f6'
};

function applyAppearance() {
    document.body.dataset.theme = appearanceSettings.theme;
    document.documentElement.style.setProperty('--accent', appearanceSettings.accent);
    themeSelect.value = appearanceSettings.theme;
    accentColorInput.value = appearanceSettings.accent;
}

function saveAppearance() {
    try {
        localStorage.setItem('dash_appearance', JSON.stringify(appearanceSettings));
        settingsMessage.textContent = '';
        return true;
    } catch {
        settingsMessage.textContent = 'Não foi possível guardar as definições do aspeto.';
        return false;
    }
}

themeSelect.addEventListener('change', () => {
    const previousTheme = appearanceSettings.theme;
    appearanceSettings.theme = themeSelect.value;
    applyAppearance();
    if (!saveAppearance()) {
        appearanceSettings.theme = previousTheme;
        applyAppearance();
    }
});

accentColorInput.addEventListener('input', () => {
    appearanceSettings.accent = accentColorInput.value;
    applyAppearance();
});

accentColorInput.addEventListener('change', () => {
    saveAppearance();
});

settingsButton.addEventListener('click', () => {
    settingsMessage.textContent = '';
    settingsDialog.showModal();
});

document.getElementById('settings-close-button').addEventListener('click', () => {
    settingsDialog.close();
});

settingsDialog.addEventListener('click', event => {
    if (event.target === settingsDialog) settingsDialog.close();
});

applyAppearance();
applyWidgetSettings();
renderWidgetSettings();
