"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
function activate(context) {
    var disposable = vscode.commands.registerCommand('pomodoro.start', function () {
        var panel = vscode.window.createWebviewPanel('pomodoro', 'Pomodoro Timer', vscode.ViewColumn.One, {
            enableScripts: true,
        });
        var timerInterval = null;
        var remainingTime = 25 * 60; // Начальное время 25 минут в секундах
        var isRunning = false;
        var isBreakPhase = true; // Флаг, указывающий на фазу перерыва
        var workPhaseCount = 0; // Счетчик фаз работы
        var phaseText = 'Time to Code!'; // Начальный текст для фазы работы
        // Начальные параметры времени
        var workDuration = 25 * 60;
        var shortBreakDuration = 5 * 60;
        var longBreakDuration = 15 * 60;
        var longBreakInterval = 4;
        // Настройки цветов для каждой фазы
        var workColor = '#FF0000';
        var shortBreakColor = '#40E0D0';
        var longBreakColor = '#FFD700';
        // Статусбар элемент
        var statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = '$(clock) Pomodoro: 25:00'; // Начальный текст в статусбаре
        statusBarItem.command = 'pomodoro.start'; // Команда для открытия основного окна
        statusBarItem.show();
        // Функция для обновления времени на веб-странице и в статусбаре
        var updateTimeDisplay = function () {
            var minutes = Math.floor(remainingTime / 60);
            var seconds = remainingTime % 60;
            var color = workColor; // Красный для фазы работы
            if (phaseText === 'Short Break') {
                color = shortBreakColor; // Бирюзовый для короткого отдыха
            }
            else if (phaseText === 'Long Break') {
                color = longBreakColor; // Желтый для длинного отдыха
            }
            panel.webview.postMessage({
                type: 'update-time',
                time: "".concat(minutes, ":").concat(seconds < 10 ? '0' : '').concat(seconds),
                phaseText: phaseText, // Отправляем текст фазы
                color: color, // Цвет текста таймера
            });
            statusBarItem.text = "$(clock) Pomodoro: ".concat(minutes, ":").concat(seconds < 10 ? '0' : '').concat(seconds);
            statusBarItem.color = color; // Устанавливаем цвет в статусбаре
        };
        // Функция для скрытия кнопки Skip
        var hideSkipButton = function () {
            panel.webview.postMessage({ type: 'toggle-skip-button', visible: false });
        };
        // Функция для показа кнопки Skip
        var showSkipButton = function () {
            panel.webview.postMessage({ type: 'toggle-skip-button', visible: true });
        };
        // Функция для переключения между фазами работы и перерыва
        var switchPhase = function () {
            if (isBreakPhase) {
                workPhaseCount++;
                if (workPhaseCount % longBreakInterval === 0) {
                    remainingTime = longBreakDuration; // Длинный перерыв
                    phaseText = 'Long Break';
                }
                else {
                    remainingTime = shortBreakDuration; // Короткий перерыв
                    phaseText = 'Short Break';
                }
                isBreakPhase = false;
            }
            else {
                remainingTime = workDuration; // Фаза работы
                phaseText = 'Time to Code!';
                isBreakPhase = true;
            }
            updateTimeDisplay();
            panel.webview.postMessage({ type: 'change-button', label: 'Start' });
            hideSkipButton();
        };
        // Отправка начального времени
        updateTimeDisplay();
        hideSkipButton();
        // Обработчик сообщений от веб-страницы
        panel.webview.onDidReceiveMessage(function (message) {
            if (message.type === 'toggle-timer') {
                if (isRunning) {
                    // Если таймер работает, приостанавливаем его
                    clearInterval(timerInterval);
                    isRunning = false;
                    panel.webview.postMessage({ type: 'change-button', label: 'Start' });
                    hideSkipButton();
                }
                else {
                    // Если таймер приостановлен, запускаем его
                    timerInterval = setInterval(function () {
                        remainingTime -= 1;
                        if (remainingTime <= 0) {
                            clearInterval(timerInterval);
                            isRunning = false;
                            switchPhase();
                        }
                        else {
                            updateTimeDisplay();
                        }
                    }, 1000);
                    isRunning = true;
                    panel.webview.postMessage({ type: 'change-button', label: 'Stop' });
                    showSkipButton();
                }
            }
            else if (message.type === 'skip-timer') {
                // Сбрасываем фазу и переходим к следующей
                clearInterval(timerInterval);
                isRunning = false;
                switchPhase();
            }
            else if (message.type === 'open-settings') {
                // Открываем меню настроек
                panel.webview.postMessage({
                    type: 'open-settings',
                    workDuration: workDuration,
                    shortBreakDuration: shortBreakDuration,
                    longBreakDuration: longBreakDuration,
                    longBreakInterval: longBreakInterval,
                    workColor: workColor,
                    shortBreakColor: shortBreakColor,
                    longBreakColor: longBreakColor
                });
            }
            else if (message.type === 'apply-settings') {
                // Применяем изменения из меню настроек
                workDuration = message.workDuration;
                shortBreakDuration = message.shortBreakDuration;
                longBreakDuration = message.longBreakDuration;
                longBreakInterval = message.longBreakInterval;
                workColor = message.workColor;
                shortBreakColor = message.shortBreakColor;
                longBreakColor = message.longBreakColor;
                // Переключаем обратно на таймер с новыми параметрами
                remainingTime = workDuration;
                phaseText = 'Time to Code!';
                isBreakPhase = true;
                updateTimeDisplay();
                panel.webview.postMessage({ type: 'close-settings' });
            }
        });
        // Содержимое webview с таймером и кнопками
        panel.webview.html = "\n            <html>\n            <body style=\"display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; position: relative; flex-direction: column;\">\n                <div style=\"text-align: center;\">\n                    <div id=\"phaseText\" style=\"font-size: 24px; margin-bottom: 5px; color: #555;\">Time to Code!</div>\n                    <h1 id=\"timer\" style=\"font-size: 72px; color: #FF0000; margin-bottom: 20px;\">25:00</h1>\n                    <button id=\"toggleButton\" style=\"font-size: 24px; padding: 10px 20px; margin-bottom: 10px;\">Start</button>\n                    <button id=\"skipButton\" style=\"font-size: 24px; padding: 10px 20px; margin-left: 10px; display: none;\">Skip</button>\n                </div>\n                <img id=\"settingsIcon\" src=\"https://img.icons8.com/ios/50/000000/settings.png\" style=\"position: absolute; top: 10px; right: 10px; width: 30px; cursor: pointer; background: white; border-radius: 5px;\" />\n                \n                <div id=\"settingsMenu\" style=\"display: none; text-align: center;\">\n                    <h2>Settings</h2>\n                    <label>Work Duration (minutes): <input type=\"number\" id=\"workDuration\" value=\"".concat(workDuration / 60, "\" /></label><br/>\n                    <label>Short Break Duration (minutes): <input type=\"number\" id=\"shortBreakDuration\" value=\"").concat(shortBreakDuration / 60, "\" /></label><br/>\n                    <label>Long Break Duration (minutes): <input type=\"number\" id=\"longBreakDuration\" value=\"").concat(longBreakDuration / 60, "\" /></label><br/>\n                    <label>Long Break Interval (phases): <input type=\"number\" id=\"longBreakInterval\" value=\"").concat(longBreakInterval, "\" /></label><br/>\n                    <label>Work Phase Color: <input type=\"color\" id=\"workColor\" value=\"").concat(workColor, "\" /></label><br/>\n                    <label>Short Break Color: <input type=\"color\" id=\"shortBreakColor\" value=\"").concat(shortBreakColor, "\" /></label><br/>\n                    <label>Long Break Color: <input type=\"color\" id=\"longBreakColor\" value=\"").concat(longBreakColor, "\" /></label><br/>\n                    <button id=\"applySettings\" style=\"font-size: 20px; padding: 10px 20px;\">Apply</button>\n                </div>\n\n                <script>\n                    const vscode = acquireVsCodeApi();\n                    const toggleButton = document.getElementById('toggleButton');\n                    const skipButton = document.getElementById('skipButton');\n                    const phaseText = document.getElementById('phaseText');\n                    const timer = document.getElementById('timer');\n                    const settingsIcon = document.getElementById('settingsIcon');\n                    const settingsMenu = document.getElementById('settingsMenu');\n                    const applySettings = document.getElementById('applySettings');\n\n                    toggleButton.addEventListener('click', () => {\n                        vscode.postMessage({ type: 'toggle-timer' });\n                    });\n\n                    skipButton.addEventListener('click', () => {\n                        vscode.postMessage({ type: 'skip-timer' });\n                    });\n\n                    settingsIcon.addEventListener('click', () => {\n                        vscode.postMessage({ type: 'open-settings' });\n                    });\n\n                    applySettings.addEventListener('click', () => {\n                        const workDuration = document.getElementById('workDuration').value * 60;\n                        const shortBreakDuration = document.getElementById('shortBreakDuration').value * 60;\n                        const longBreakDuration = document.getElementById('longBreakDuration').value * 60;\n                        const longBreakInterval = document.getElementById('longBreakInterval').value;\n                        const workColor = document.getElementById('workColor').value;\n                        const shortBreakColor = document.getElementById('shortBreakColor').value;\n                        const longBreakColor = document.getElementById('longBreakColor').value;\n\n                        vscode.postMessage({\n                            type: 'apply-settings',\n                            workDuration,\n                            shortBreakDuration,\n                            longBreakDuration,\n                            longBreakInterval,\n                            workColor,\n                            shortBreakColor,\n                            longBreakColor\n                        });\n                    });\n\n                    window.addEventListener('message', (event) => {\n                        const message = event.data;\n                        if (message.type === 'update-time') {\n                            timer.textContent = message.time;\n                            phaseText.textContent = message.phaseText; // \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0442\u0435\u043A\u0441\u0442 \u0444\u0430\u0437\u044B\n                            timer.style.color = message.color; // \u0423\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u0446\u0432\u0435\u0442 \u0442\u0430\u0439\u043C\u0435\u0440\u0430\n                        } else if (message.type === 'change-button') {\n                            toggleButton.textContent = message.label;\n                        } else if (message.type === 'toggle-skip-button') {\n                            skipButton.style.display = message.visible ? 'inline-block' : 'none';\n                        } else if (message.type === 'open-settings') {\n                            settingsMenu.style.display = 'block';\n                            document.querySelector('div').style.display = 'none';\n\n                            // \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A\n                            document.getElementById('workDuration').value = message.workDuration / 60;\n                            document.getElementById('shortBreakDuration').value = message.shortBreakDuration / 60;\n                            document.getElementById('longBreakDuration').value = message.longBreakDuration / 60;\n                            document.getElementById('longBreakInterval').value = message.longBreakInterval;\n                            document.getElementById('workColor').value = message.workColor;\n                            document.getElementById('shortBreakColor').value = message.shortBreakColor;\n                            document.getElementById('longBreakColor').value = message.longBreakColor;\n                        } else if (message.type === 'close-settings') {\n                            settingsMenu.style.display = 'none';\n                            document.querySelector('div').style.display = 'block';\n                        }\n                    });\n                </script>\n            </body>\n            </html>\n        ");
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
