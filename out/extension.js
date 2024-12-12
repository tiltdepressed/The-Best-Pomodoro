"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    let disposable = vscode.commands.registerCommand('pomodoro.start', () => {
        const panel = vscode.window.createWebviewPanel('pomodoro', 'Pomodoro Timer', vscode.ViewColumn.One, {
            enableScripts: true,
        });
        let timerInterval = null;
        let remainingTime = 25 * 60; // Начальное время 25 минут в секундах
        let isRunning = false;
        let isBreakPhase = true; // Флаг, указывающий на фазу перерыва
        let workPhaseCount = 0; // Счетчик фаз работы
        let phaseText = 'Time to Code!'; // Начальный текст для фазы работы
        // Начальные параметры времени
        let workDuration = 25 * 60;
        let shortBreakDuration = 5 * 60;
        let longBreakDuration = 15 * 60;
        let longBreakInterval = 4;
        // Настройки цветов для каждой фазы
        let workColor = '#FF0000';
        let shortBreakColor = '#40E0D0';
        let longBreakColor = '#FFD700';
        // Функция для обновления времени на веб-странице
        const updateTimeDisplay = () => {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            let color = workColor; // Красный для фазы работы
            if (phaseText === 'Short Break') {
                color = shortBreakColor; // Бирюзовый для короткого отдыха
            }
            else if (phaseText === 'Long Break') {
                color = longBreakColor; // Желтый для длинного отдыха
            }
            panel.webview.postMessage({
                type: 'update-time',
                time: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
                phaseText: phaseText, // Отправляем текст фазы
                color: color // Цвет текста таймера
            });
        };
        // Функция для скрытия кнопки Skip
        const hideSkipButton = () => {
            panel.webview.postMessage({ type: 'toggle-skip-button', visible: false });
        };
        // Функция для показа кнопки Skip
        const showSkipButton = () => {
            panel.webview.postMessage({ type: 'toggle-skip-button', visible: true });
        };
        // Функция для переключения между фазами работы и перерыва
        const switchPhase = () => {
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
        panel.webview.onDidReceiveMessage((message) => {
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
                    timerInterval = setInterval(() => {
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
                    workDuration,
                    shortBreakDuration,
                    longBreakDuration,
                    longBreakInterval,
                    workColor,
                    shortBreakColor,
                    longBreakColor
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
        panel.webview.html = `
            <html>
            <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; position: relative; flex-direction: column;">
                <div style="text-align: center;">
                    <div id="phaseText" style="font-size: 24px; margin-bottom: 5px; color: #555;">Time to Code!</div>
                    <h1 id="timer" style="font-size: 72px; color: #FF0000; margin-bottom: 20px;">25:00</h1>
                    <button id="toggleButton" style="font-size: 24px; padding: 10px 20px; margin-bottom: 10px;">Start</button>
                    <button id="skipButton" style="font-size: 24px; padding: 10px 20px; margin-left: 10px; display: none;">Skip</button>
                </div>
                <img id="settingsIcon" src="https://img.icons8.com/ios/50/000000/settings.png" style="position: absolute; top: 10px; right: 10px; width: 30px; cursor: pointer; background: white; border-radius: 5px;" />
                
                <div id="settingsMenu" style="display: none; text-align: center;">
                    <h2>Settings</h2>
                    <label>Work Duration (minutes): <input type="number" id="workDuration" value="${workDuration / 60}" /></label><br/>
                    <label>Short Break Duration (minutes): <input type="number" id="shortBreakDuration" value="${shortBreakDuration / 60}" /></label><br/>
                    <label>Long Break Duration (minutes): <input type="number" id="longBreakDuration" value="${longBreakDuration / 60}" /></label><br/>
                    <label>Long Break Interval (phases): <input type="number" id="longBreakInterval" value="${longBreakInterval}" /></label><br/>
                    <label>Work Phase Color: <input type="color" id="workColor" value="${workColor}" /></label><br/>
                    <label>Short Break Color: <input type="color" id="shortBreakColor" value="${shortBreakColor}" /></label><br/>
                    <label>Long Break Color: <input type="color" id="longBreakColor" value="${longBreakColor}" /></label><br/>
                    <button id="applySettings" style="font-size: 20px; padding: 10px 20px;">Apply</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const toggleButton = document.getElementById('toggleButton');
                    const skipButton = document.getElementById('skipButton');
                    const phaseText = document.getElementById('phaseText');
                    const timer = document.getElementById('timer');
                    const settingsIcon = document.getElementById('settingsIcon');
                    const settingsMenu = document.getElementById('settingsMenu');
                    const applySettings = document.getElementById('applySettings');

                    toggleButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'toggle-timer' });
                    });

                    skipButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'skip-timer' });
                    });

                    settingsIcon.addEventListener('click', () => {
                        vscode.postMessage({ type: 'open-settings' });
                    });

                    applySettings.addEventListener('click', () => {
                        const workDuration = document.getElementById('workDuration').value * 60;
                        const shortBreakDuration = document.getElementById('shortBreakDuration').value * 60;
                        const longBreakDuration = document.getElementById('longBreakDuration').value * 60;
                        const longBreakInterval = document.getElementById('longBreakInterval').value;
                        const workColor = document.getElementById('workColor').value;
                        const shortBreakColor = document.getElementById('shortBreakColor').value;
                        const longBreakColor = document.getElementById('longBreakColor').value;

                        vscode.postMessage({
                            type: 'apply-settings',
                            workDuration,
                            shortBreakDuration,
                            longBreakDuration,
                            longBreakInterval,
                            workColor,
                            shortBreakColor,
                            longBreakColor
                        });
                    });

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.type === 'update-time') {
                            timer.textContent = message.time;
                            phaseText.textContent = message.phaseText; // Обновляем текст фазы
                            timer.style.color = message.color; // Устанавливаем цвет таймера
                        } else if (message.type === 'change-button') {
                            toggleButton.textContent = message.label;
                        } else if (message.type === 'toggle-skip-button') {
                            skipButton.style.display = message.visible ? 'inline-block' : 'none';
                        } else if (message.type === 'open-settings') {
                            settingsMenu.style.display = 'block';
                            document.querySelector('div').style.display = 'none';

                            // Обновляем текущие значения настроек
                            document.getElementById('workDuration').value = message.workDuration / 60;
                            document.getElementById('shortBreakDuration').value = message.shortBreakDuration / 60;
                            document.getElementById('longBreakDuration').value = message.longBreakDuration / 60;
                            document.getElementById('longBreakInterval').value = message.longBreakInterval;
                            document.getElementById('workColor').value = message.workColor;
                            document.getElementById('shortBreakColor').value = message.shortBreakColor;
                            document.getElementById('longBreakColor').value = message.longBreakColor;
                        } else if (message.type === 'close-settings') {
                            settingsMenu.style.display = 'none';
                            document.querySelector('div').style.display = 'block';
                        }
                    });
                </script>
            </body>
            </html>
        `;
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map