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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
let timerInterval = null;
let remainingTime = 25 * 60; // Начальное время 25 минут в секундах
let isRunning = false;
let phaseText = 'Time to Code!'; // Начальный текст фазы
let workPhaseCount = 0; // Счетчик фаз работы
let isBreakPhase = true; // Флаг, указывающий на фазу перерыва
// Начальные параметры времени
let workDuration = 25 * 60;
let shortBreakDuration = 5 * 60;
let longBreakDuration = 15 * 60;
let longBreakInterval = 4;
// Цвета для фаз
let workColor = '#FF0000';
let shortBreakColor = '#40E0D0';
let longBreakColor = '#FFD700';
// Строка состояния для маленького таймера
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
statusBarItem.text = `$(watch) Pomodoro: 25:00`;
statusBarItem.tooltip = 'Pomodoro Timer';
statusBarItem.command = 'pomodoro.openLargeTimer'; // Открыть большой таймер при клике
statusBarItem.show();
// Функция для обновления времени
const updateTimeDisplay = () => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    let color = workColor;
    if (phaseText === 'Short Break') {
        color = shortBreakColor;
    }
    else if (phaseText === 'Long Break') {
        color = longBreakColor;
    }
    // Обновляем маленький таймер в строке состояния
    statusBarItem.text = `$(watch) Pomodoro: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    // Также можно отправлять обновления в webview (если оно открыто)
    if (panel) {
        panel.webview.postMessage({
            type: 'update-time',
            time: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
            phaseText: phaseText,
            color: color
        });
    }
};
// Функция для переключения фаз
const switchPhase = () => {
    if (isBreakPhase) {
        workPhaseCount++;
        if (workPhaseCount % longBreakInterval === 0) {
            remainingTime = longBreakDuration;
            phaseText = 'Long Break';
        }
        else {
            remainingTime = shortBreakDuration;
            phaseText = 'Short Break';
        }
        isBreakPhase = false;
    }
    else {
        remainingTime = workDuration;
        phaseText = 'Time to Code!';
        isBreakPhase = true;
    }
    updateTimeDisplay();
};
// Обработчик сообщений от webview
const handleWebviewMessage = (message) => {
    if (message.type === 'toggle-timer') {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            panel?.webview.postMessage({ type: 'change-button', label: 'Start' });
            panel?.webview.postMessage({ type: 'toggle-skip-button', visible: false });
        }
        else {
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
            panel?.webview.postMessage({ type: 'change-button', label: 'Stop' });
            panel?.webview.postMessage({ type: 'toggle-skip-button', visible: true });
        }
    }
    else if (message.type === 'skip-timer') {
        clearInterval(timerInterval);
        isRunning = false;
        switchPhase();
        panel?.webview.postMessage({ type: 'change-button', label: 'Start' }); // После пропуска ставим "Start"
    }
    else if (message.type === 'open-settings') {
        panel?.webview.postMessage({
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
        workDuration = message.workDuration;
        shortBreakDuration = message.shortBreakDuration;
        longBreakDuration = message.longBreakDuration;
        longBreakInterval = message.longBreakInterval;
        workColor = message.workColor;
        shortBreakColor = message.shortBreakColor;
        longBreakColor = message.longBreakColor;
        remainingTime = workDuration;
        phaseText = 'Time to Code!';
        isBreakPhase = true;
        updateTimeDisplay();
        panel?.webview.postMessage({ type: 'close-settings' });
    }
};
// Обработчик команды для открытия большого таймера
let panel = null;
const openLargeTimer = () => {
    if (!panel) {
        // Создаем панель, если она еще не была создана
        panel = vscode.window.createWebviewPanel('pomodoro', 'Pomodoro Timer', vscode.ViewColumn.One, {
            enableScripts: true,
        });
        // Отправляем начальные данные в панель
        updateTimeDisplay();
        // Обработчик сообщений от веб-панели
        panel.webview.onDidReceiveMessage(handleWebviewMessage);
        // HTML для большого таймера
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
                    const phaseTextElement = document.getElementById('phaseText');
                    const timerElement = document.getElementById('timer');
                    const settingsIcon = document.getElementById('settingsIcon');
                    const settingsMenu = document.getElementById('settingsMenu');

                    toggleButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'toggle-timer' });
                    });

                    skipButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'skip-timer' });
                    });

                    settingsIcon.addEventListener('click', () => {
                        settingsMenu.style.display = 'block';
                    });

                    document.getElementById('applySettings').addEventListener('click', () => {
                        const workDuration = document.getElementById('workDuration').value;
                        const shortBreakDuration = document.getElementById('shortBreakDuration').value;
                        const longBreakDuration = document.getElementById('longBreakDuration').value;
                        const longBreakInterval = document.getElementById('longBreakInterval').value;
                        const workColor = document.getElementById('workColor').value;
                        const shortBreakColor = document.getElementById('shortBreakColor').value;
                        const longBreakColor = document.getElementById('longBreakColor').value;
                        vscode.postMessage({
                            type: 'apply-settings',
                            workDuration: workDuration * 60,
                            shortBreakDuration: shortBreakDuration * 60,
                            longBreakDuration: longBreakDuration * 60,
                            longBreakInterval,
                            workColor,
                            shortBreakColor,
                            longBreakColor
                        });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'update-time') {
                            timerElement.textContent = message.time;
                            phaseTextElement.textContent = message.phaseText;
                            timerElement.style.color = message.color;
                        } else if (message.type === 'change-button') {
                            toggleButton.textContent = message.label;
                        } else if (message.type === 'toggle-skip-button') {
                            skipButton.style.display = message.visible ? 'inline-block' : 'none';
                        } else if (message.type === 'close-settings') {
                            settingsMenu.style.display = 'none';
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
    else {
        panel.reveal();
    }
    // Слушаем событие закрытия панели
    panel.onDidDispose(() => {
        panel = null;
    });
};
// Регистрация команды для открытия таймера
vscode.commands.registerCommand('pomodoro.openLargeTimer', openLargeTimer);
//# sourceMappingURL=extension.js.map