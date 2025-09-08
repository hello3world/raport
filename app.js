/**
 * Главное приложение для формы суточного рапорта
 */

class ReportFormApp {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.formData = {};
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.currentDraftId = null;

        this.init();
    }

    async init() {
        console.log('Инициализация приложения...');

        // Ждем инициализации storage adapter
        try {
            await window.storageAdapter.init();
            console.log('Storage adapter инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации storage adapter:', error);
        }

        // Устанавливаем текущую дату по умолчанию
        const today = new Date().toISOString().split('T')[0];
        const reportDateField = document.getElementById('reportDate');
        if (reportDateField) {
            reportDateField.value = today;
        }

        // Инициализируем обработчики событий
        this.initEventListeners();

        // Проверяем наличие сохраненных черновиков
        try {
            await this.checkForDrafts();
        } catch (error) {
            console.error('Ошибка проверки черновиков:', error);
            // При ошибке показываем кнопку новой формы
            this.showNoDraft();
        }

        console.log('Приложение инициализировано');
    }

    initEventListeners() {
        // Загрузочный экран
        document.getElementById('restore-draft')?.addEventListener('click', () => {
            console.log('Восстановление черновика...');
            this.restoreDraft();
        });
        document.getElementById('start-new')?.addEventListener('click', () => {
            console.log('Начать новую форму...');
            this.startNewForm();
        });
        document.getElementById('start-form')?.addEventListener('click', () => {
            console.log('Начать заполнение формы...');
            this.startNewForm();
        });

        // Навигация по шагам
        document.getElementById('next-step')?.addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step')?.addEventListener('click', () => this.prevStep());

        // Сохранение черновика
        document.getElementById('save-draft')?.addEventListener('click', () => this.saveDraft());

        // Предпросмотр
        document.getElementById('edit-form')?.addEventListener('click', () => this.editForm());
        document.getElementById('save-final')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('submit-form')?.addEventListener('click', () => this.submitForm());

        // Модальные окна
        document.querySelector('.modal-close')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-confirm')?.addEventListener('click', () => this.confirmModalAction());

        // Автосохранение при изменении полей
        this.initAutoSave();

        // Обработка файлов
        document.getElementById('attachments')?.addEventListener('change', (e) => this.handleFileSelection(e));

        // Предотвращение потери данных при закрытии
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });
    }

    initAutoSave() {
        const formInputs = document.querySelectorAll('#main-form input, #main-form select, #main-form textarea');

        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.isDirty = true;
                this.scheduleAutoSave();
            });

            input.addEventListener('change', () => {
                this.isDirty = true;
                this.scheduleAutoSave();
            });
        });
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.showSaveStatus('saving');

        this.autoSaveTimeout = setTimeout(() => {
            this.autoSave();
        }, 1500); // Debounce 1.5 секунды
    }

    async autoSave() {
        try {
            await this.saveDraft(true);
            this.showSaveStatus('saved');
        } catch (error) {
            console.error('Ошибка автосохранения:', error);
            this.showSaveStatus('error');
        }
    }

    async checkForDrafts() {
        try {
            console.log('Проверка черновиков...');
            const drafts = await window.storageAdapter.getAllItems();
            console.log('Найдено элементов:', drafts.length);
            const activeDrafts = drafts.filter(draft => draft.status === 'draft');
            console.log('Активных черновиков:', activeDrafts.length);

            if (activeDrafts.length > 0) {
                // Берем самый свежий черновик
                const latestDraft = activeDrafts.sort((a, b) =>
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                )[0];

                this.showDraftDetection(latestDraft);
            } else {
                this.showNoDraft();
            }
        } catch (error) {
            console.error('Ошибка проверки черновиков:', error);
            this.showNoDraft();
        }
    }

    showDraftDetection(draft) {
        const draftDate = new Date(draft.updatedAt).toLocaleString('ru-RU');
        document.getElementById('draft-date').textContent = draftDate;
        document.getElementById('draft-detection').style.display = 'block';
        this.latestDraftId = draft.id;
    }

    showNoDraft() {
        console.log('Показываем кнопку новой формы');
        const noDraftElement = document.getElementById('no-draft');
        if (noDraftElement) {
            noDraftElement.style.display = 'block';
            console.log('Кнопка стала видимой');
        } else {
            console.error('Элемент no-draft не найден!');
        }
    }

    async restoreDraft() {
        try {
            const draft = await window.storageAdapter.getItem(this.latestDraftId);
            if (draft) {
                this.currentDraftId = this.latestDraftId;
                this.formData = draft.form || {};
                this.currentStep = draft.currentStep || 1;
                this.populateForm();
                this.showFormScreen();
                this.updateProgressBar();
                this.isDirty = false;
                console.log('Черновик восстановлен');
            }
        } catch (error) {
            console.error('Ошибка восстановления черновика:', error);
            this.startNewForm();
        }
    }

    startNewForm() {
        console.log('Запуск новой формы...');
        this.currentDraftId = null;
        this.formData = {};
        this.currentStep = 1;
        this.isDirty = false;
        this.showFormScreen();
        this.updateProgressBar();
        console.log('Новая форма запущена');
    }

    populateForm() {
        Object.keys(this.formData).forEach(key => {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${this.formData[key]}"]`);
                    if (radio) radio.checked = true;
                } else if (element.type === 'checkbox') {
                    element.checked = this.formData[key];
                } else {
                    element.value = this.formData[key];
                }
            }
        });

        // Восстанавливаем файлы
        if (this.formData.attachments) {
            this.displayFileList(this.formData.attachments);
        }
    }

    collectFormData() {
        const formElements = document.querySelectorAll('#main-form input, #main-form select, #main-form textarea');
        const data = {};

        formElements.forEach(element => {
            const name = element.name || element.id;
            if (name) {
                if (element.type === 'radio') {
                    if (element.checked) {
                        data[name] = element.value;
                    }
                } else if (element.type === 'checkbox') {
                    data[name] = element.checked;
                } else if (element.type !== 'file') {
                    data[name] = element.value;
                }
            }
        });

        // Сохраняем файлы отдельно
        if (this.formData.attachments) {
            data.attachments = this.formData.attachments;
        }

        return data;
    }

    validateStep(step) {
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;

        // Очищаем предыдущие ошибки
        document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

        requiredFields.forEach(field => {
            let hasValue = false;

            if (field.type === 'radio') {
                const radioGroup = document.querySelectorAll(`[name="${field.name}"]`);
                hasValue = Array.from(radioGroup).some(radio => radio.checked);
            } else {
                hasValue = field.value.trim() !== '';
            }

            if (!hasValue) {
                this.showFieldError(field, 'Это поле обязательно для заполнения');
                isValid = false;
            }
        });

        // Дополнительная валидация
        if (step === 2) {
            const dutyStart = document.getElementById('dutyStart').value;
            const dutyEnd = document.getElementById('dutyEnd').value;

            if (dutyStart && dutyEnd && dutyStart >= dutyEnd) {
                this.showFieldError(document.getElementById('dutyEnd'), 'Время окончания должно быть позже времени заступления');
                isValid = false;
            }
        }

        return isValid;
    }

    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');

        if (formGroup) formGroup.classList.add('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    async nextStep() {
        if (!this.validateStep(this.currentStep)) {
            return;
        }

        this.formData = { ...this.formData, ...this.collectFormData() };

        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateFormStep();
        } else {
            // Переход к предпросмотру
            this.showPreview();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.formData = { ...this.formData, ...this.collectFormData() };
            this.currentStep--;
            this.updateFormStep();
        }
    }

    updateFormStep() {
        // Скрываем все шаги
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Показываем текущий шаг
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }

        // Обновляем навигацию
        document.getElementById('prev-step').style.display = this.currentStep > 1 ? 'block' : 'none';
        document.getElementById('next-step').textContent =
            this.currentStep < this.maxSteps ? 'Далее' : 'Предпросмотр';

        this.updateProgressBar();
    }

    updateProgressBar() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    async handleFileSelection(event) {
        const files = Array.from(event.target.files);

        try {
            const filePromises = files.map(file => window.storageAdapter.saveFile(file));
            const savedFiles = await Promise.all(filePromises);

            this.formData.attachments = this.formData.attachments || [];
            this.formData.attachments.push(...savedFiles);

            this.displayFileList(this.formData.attachments);
            this.isDirty = true;

            // Очищаем input для возможности повторного выбора того же файла
            event.target.value = '';
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            this.showMessage('Ошибка загрузки файлов', 'error');
        }
    }

    displayFileList(files) {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name} (${this.formatFileSize(file.size)})</span>
                <button type="button" class="file-remove" data-index="${index}">&times;</button>
            `;

            const removeButton = fileItem.querySelector('.file-remove');
            removeButton.addEventListener('click', () => this.removeFile(index));

            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        if (this.formData.attachments) {
            this.formData.attachments.splice(index, 1);
            this.displayFileList(this.formData.attachments);
            this.isDirty = true;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async saveDraft(isAutoSave = false) {
        try {
            if (!this.currentDraftId) {
                this.currentDraftId = window.storageAdapter.generateId();
            }

            const currentData = this.collectFormData();
            this.formData = { ...this.formData, ...currentData };

            const draftData = {
                id: this.currentDraftId,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                currentStep: this.currentStep,
                form: this.formData
            };

            await window.storageAdapter.setItem(this.currentDraftId, draftData);

            this.isDirty = false;

            if (!isAutoSave) {
                this.showSaveStatus('saved');
                setTimeout(() => this.showSaveStatus(''), 3000);
            }

            console.log('Черновик сохранен:', this.currentDraftId);
        } catch (error) {
            console.error('Ошибка сохранения черновика:', error);
            this.showSaveStatus('error');
        }
    }

    showSaveStatus(status) {
        const statusElement = document.getElementById('save-status');
        statusElement.className = `save-status ${status}`;

        switch (status) {
            case 'saving':
                statusElement.textContent = 'Сохранение...';
                break;
            case 'saved':
                statusElement.textContent = 'Сохранено';
                break;
            case 'error':
                statusElement.textContent = 'Ошибка сохранения';
                break;
            default:
                statusElement.textContent = '';
        }
    }

    showPreview() {
        this.formData = { ...this.formData, ...this.collectFormData() };
        this.generatePreview();
        this.showScreen('preview-screen');
    }

    generatePreview() {
        const previewContent = document.getElementById('preview-content');
        const reportDate = new Date(this.formData.reportDate || new Date()).toLocaleDateString('ru-RU');

        previewContent.innerHTML = `
            <div class="report-header">
                <div class="report-title">СУТОЧНЫЙ РАПОРТ</div>
                <div class="report-date">от ${reportDate}</div>
            </div>

            <div class="report-section">
                <h3>Личные данные</h3>
                <div class="report-field">
                    <span class="field-label">ФИО:</span>
                    <span class="field-value">${this.formData.fullName || 'Не указано'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Звание:</span>
                    <span class="field-value">${this.formData.rank || 'Не указано'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Должность:</span>
                    <span class="field-value">${this.formData.position || 'Не указано'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Подразделение:</span>
                    <span class="field-value">${this.formData.unit || 'Не указано'}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Служебная информация</h3>
                <div class="report-field">
                    <span class="field-label">Дата рапорта:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Тип службы:</span>
                    <span class="field-value">${this.formData.dutyType || 'Не указано'}</span>
                </div>
                ${this.formData.dutyStart ? `
                <div class="report-field">
                    <span class="field-label">Время заступления:</span>
                    <span class="field-value">${this.formData.dutyStart}</span>
                </div>
                ` : ''}
                ${this.formData.dutyEnd ? `
                <div class="report-field">
                    <span class="field-label">Время окончания:</span>
                    <span class="field-value">${this.formData.dutyEnd}</span>
                </div>
                ` : ''}
                ${this.formData.location ? `
                <div class="report-field">
                    <span class="field-label">Место несения службы:</span>
                    <span class="field-value">${this.formData.location}</span>
                </div>
                ` : ''}
            </div>

            <div class="report-section">
                <h3>Дополнительная информация</h3>
                ${this.formData.incidents ? `
                <div class="report-field vertical">
                    <span class="field-label">Происшествия и особые отметки:</span>
                    <span class="field-value">${this.formData.incidents}</span>
                </div>
                ` : ''}
                ${this.formData.equipment ? `
                <div class="report-field vertical">
                    <span class="field-label">Состояние оборудования и техники:</span>
                    <span class="field-value">${this.formData.equipment}</span>
                </div>
                ` : ''}
                ${this.formData.weather ? `
                <div class="report-field">
                    <span class="field-label">Погодные условия:</span>
                    <span class="field-value">${this.formData.weather}</span>
                </div>
                ` : ''}
                ${this.formData.noIncidents ? `
                <div class="report-field">
                    <span class="field-label">Происшествий не было:</span>
                    <span class="field-value">Да</span>
                </div>
                ` : ''}
                ${this.formData.additionalNotes ? `
                <div class="report-field vertical">
                    <span class="field-label">Дополнительные замечания:</span>
                    <span class="field-value">${this.formData.additionalNotes}</span>
                </div>
                ` : ''}
                ${this.formData.attachments && this.formData.attachments.length > 0 ? `
                <div class="report-field vertical">
                    <span class="field-label">Приложения:</span>
                    <span class="field-value">
                        ${this.formData.attachments.map(file => file.name).join(', ')}
                    </span>
                </div>
                ` : ''}
            </div>

            <div class="report-signature">
                <div class="signature-block">
                    <div class="signature-line">
                        <div>Подпись</div>
                    </div>
                    <div class="signature-line">
                        <div>Дата</div>
                    </div>
                </div>
            </div>
        `;
    }

    editForm() {
        this.showScreen('form-screen');
    }

    async exportToPDF() {
        try {
            const element = document.getElementById('preview-content');
            const opt = {
                margin: [15, 15, 15, 15],
                filename: `Суточный_рапорт_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
            console.log('PDF экспортирован успешно');
        } catch (error) {
            console.error('Ошибка экспорта PDF:', error);
            this.showMessage('Ошибка экспорта в PDF. Попробуйте еще раз.', 'error');
        }
    }

    async submitForm() {
        this.showModal(
            'Подтверждение отправки',
            'Вы уверены, что хотите отправить рапорт? После отправки редактирование будет невозможно.',
            async () => {
                try {
                    // Сохраняем как завершенный документ
                    const finalData = {
                        id: this.currentDraftId || window.storageAdapter.generateId(),
                        status: 'submitted',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        submittedAt: new Date().toISOString(),
                        currentStep: 4,
                        form: this.formData
                    };

                    await window.storageAdapter.setItem(finalData.id, finalData);
                    this.isDirty = false;

                    this.showMessage('Рапорт успешно отправлен!', 'success');

                    // Очищаем форму и возвращаемся к началу
                    setTimeout(() => {
                        this.startNewForm();
                        this.showScreen('loading-screen');
                        this.checkForDrafts();
                    }, 2000);

                } catch (error) {
                    console.error('Ошибка отправки рапорта:', error);
                    this.showMessage('Ошибка отправки рапорта. Попробуйте еще раз.', 'error');
                }
            }
        );
    }

    showScreen(screenId) {
        console.log(`Переключение на экран: ${screenId}`);
        const screens = document.querySelectorAll('.screen');
        console.log(`Найдено экранов: ${screens.length}`);

        screens.forEach(screen => {
            console.log(`Скрываем экран: ${screen.id}`);
            screen.classList.remove('active');
            // Принудительно скрываем
            screen.style.display = 'none';
        });

        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            console.log(`Показываем экран: ${screenId}`);
            targetScreen.classList.add('active');
            console.log(`Экран ${screenId} теперь имеет классы:`, targetScreen.className);
            
            // Дополнительная диагностика CSS
            const computedStyle = window.getComputedStyle(targetScreen);
            console.log(`Computed display style для ${screenId}:`, computedStyle.display);
            console.log(`Computed visibility для ${screenId}:`, computedStyle.visibility);
            
            // Принудительная установка стиля как fallback
            targetScreen.style.display = 'block';
            targetScreen.style.visibility = 'visible';
            console.log(`Принудительно установлены стили для ${screenId}`);
            
            // Проверяем состояние всех экранов
            setTimeout(() => {
                document.querySelectorAll('.screen').forEach(s => {
                    const computed = window.getComputedStyle(s);
                    console.log(`Экран ${s.id}: classes=${s.className}, display=${computed.display}, visibility=${computed.visibility}`);
                });
            }, 100);
        } else {
            console.error(`Экран с ID ${screenId} не найден!`);
        }
    }

    showFormScreen() {
        console.log('Показываем экран формы...');
        this.showScreen('form-screen');
        this.updateFormStep();
        console.log('Экран формы отображён');
    }

    showModal(title, message, confirmCallback) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-overlay').classList.add('active');

        this.modalConfirmCallback = confirmCallback;
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
        this.modalConfirmCallback = null;
    }

    confirmModalAction() {
        if (this.modalConfirmCallback) {
            this.modalConfirmCallback();
        }
        this.hideModal();
    }

    showMessage(message, type = 'info') {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем приложение...');

    // Проверяем наличие основных элементов
    const startFormBtn = document.getElementById('start-form');
    console.log('Кнопка start-form найдена:', !!startFormBtn);

    // Создаем приложение
    window.reportApp = new ReportFormApp();

    // Fallback для кнопки, если что-то пошло не так
    setTimeout(() => {
        const noDraftElement = document.getElementById('no-draft');
        if (noDraftElement && noDraftElement.style.display === 'none') {
            console.log('Принудительно показываем кнопку начала формы');
            noDraftElement.style.display = 'block';
        }

        // Добавляем дополнительные обработчики как fallback
        const startFormBtn = document.getElementById('start-form');
        if (startFormBtn) {
            startFormBtn.addEventListener('click', () => {
                console.log('Fallback: клик по кнопке начать заполнение');
                if (window.reportApp) {
                    window.reportApp.startNewForm();
                } else {
                    // Прямое переключение на форму
                    console.log('Прямое переключение на форму...');
                    document.querySelectorAll('.screen').forEach(s => {
                        s.style.display = 'none';
                        s.classList.remove('active');
                    });
                    const formScreen = document.getElementById('form-screen');
                    if (formScreen) {
                        formScreen.style.display = 'block';
                        formScreen.classList.add('active');
                        console.log('Форма принудительно отображена');
                    }
                }
            });
        }
    }, 2000);
});