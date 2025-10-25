class ReportFormApp {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.formData = {};
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.currentDraftId = null;
        this.selectedForm = null;
        this.authenticated = false;
        this.formOpenedFrom = null; // Track where the form was opened from ('retrospective' or null)
        this.isAdminAuthenticated = false; // For full report authentication
        this.departments = {
            'teploelektracentral': {
                name: 'ТЕПЛОЭЛЕКТРОЦЕНТРАЛИ',
                users: {
                    'teplo_user': 'teplo_pass',
                    'admin': 'admin'
                }
            },
            'stokovye_vody': {
                name: 'УЧАСТКА ПО ЗАБОРУ, ПОДГОТОВКЕ И ОЧИСТКЕ СТОЧНЫХ ВОД',
                users: {
                    'stok_user': 'stok_pass',
                    'admin': 'admin'
                }
            },
            'parosilovoe_hozyaystvo': {
                name: 'УЧАСТКА ПАРОСИЛОВОГО ХОЗЯЙСТВА',
                users: {
                    'paro_user': 'paro_pass',
                    'admin': 'admin'
                }
            },
            'elektroremontnyi_ceh': {
                name: 'ЭЛЕКТРОРЕМОНТНОГО ЦЕХА',
                users: {
                    'elektro_user': 'elektro_pass',
                    'admin': 'admin'
                }
            }
        };
    }
    render() {
        document.body.innerHTML = `
            <div class="form-container">
                <h1>Отчет</h1>
                <div class="form-steps">
                    ${this.renderSteps()}
                </div>
                <div class="form-body">
                    ${this.renderCurrentStep()}
                </div>
            </div>
        `;
    }
    renderSteps() {
        let stepsHtml = '';
        for (let i = 1; i <= this.maxSteps; i++) {
            stepsHtml += `
                <div class="step ${i === this.currentStep ? 'active' : ''}">
                    Шаг ${i}
                </div>
            `;
        }
        return stepsHtml;
    }
    renderCurrentStep() {
        if (this.currentStep === 1) {
            return this.renderStep1();
        } else if (this.currentStep === 2) {
            return this.renderStep2();
        } else if (this.currentStep === 3) {
            return this.renderStep3();
        }
    }
    renderStep1() {
        return `
            <div class="input-group">
                <label for="name">Имя:</label>
                <input type="text" id="name" name="name" value="${this.formData.name || ''}" onchange="app.onInputChange(event)">
            </div>
            <div class="input-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" value="${this.formData.email || ''}" onchange="app.onInputChange(event)">
            </div>
        `;
    }
    renderStep2() {
        return `
            <div class="input-group">
                <label for="age">Возраст:</label>
                <input type="number" id="age" name="age" value="${this.formData.age || ''}" onchange="app.onInputChange(event)">
            </div>
            <div class="input-group">
                <label for="location">Местоположение:</label>
                <input type="text" id="location" name="location" value="${this.formData.location || ''}" onchange="app.onInputChange(event)">
            </div>
        `;
    }
    renderStep3() {
        return `
            <div class="input-group">
                <label for="comments">Комментарии:</label>
                <textarea id="comments" name="comments" onchange="app.onInputChange(event)">${this.formData.comments || ''}</textarea>
            </div>
            <button onclick="app.submitForm()">Отправить</button>
        `;
    }
    onInputChange(event) {
        const { name, value } = event.target;
        this.formData[name] = value;
        this.isDirty = true;
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

        // Инициализируем обработчики событий
        this.initEventListeners();

        console.log('Приложение инициализировано');
    }

    initEventListeners() {
        document.querySelectorAll('.form-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target;
                let formType = '';
                if (target instanceof HTMLElement) {
                    formType = target.getAttribute('data-form') || target.parentElement?.getAttribute('data-form') || '';
                }
                this.selectForm(formType);
            });
        });

        // Add event listener for update page link
        document.getElementById('update-page-link')?.addEventListener('click', () => {
            window.location.href = 'update.html';
        });

        // Add event listener for checklist button
        document.getElementById('checklist-button')?.addEventListener('click', () => {
            window.location.href = 'checklist.html';
        });

        // Аутентификация для обычных форм
        document.getElementById('authentication-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.authenticate();
        });

        // Аутентификация для полного отчета
        document.getElementById('full-report-authentication-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.authenticateFullReport();
        });

        document.getElementById('back-to-main')?.addEventListener('click', () => {
            this.showScreen('main-screen');
        });

        // Back button for loading screen
        document.getElementById('back-to-main-loading')?.addEventListener('click', () => {
            this.showScreen('main-screen');
        });

        // Back buttons for full report screens
        document.getElementById('back-to-main-full-report')?.addEventListener('click', () => {
            this.showScreen('main-screen');
        });

        document.getElementById('back-to-auth-full-report')?.addEventListener('click', () => {
            this.showScreen('full-report-auth-screen');
        });

        // Загрузочный экран
        document.getElementById('restore-draft')?.addEventListener('click', () => {
            console.log('Восстановление черновика...');
            this.restoreDraft();
        });
        document.getElementById('start-new')?.addEventListener('click', () => {
            console.log('Начать новую форму...');
            // Show confirmation modal before starting new form
            this.showModal(
                'Подтверждение начала новой формы',
                'Вы уверены, что хотите начать новую форму? Все несохраненные данные будут потеряны.',
                () => {
                    this.startNewForm();
                }
            );
        });
        document.getElementById('start-form')?.addEventListener('click', () => {
            console.log('Начало заполнения отчета...');
            this.startNewForm();
        });

        // Add event listener for back button in retrospective screen
        document.getElementById('back-to-loading')?.addEventListener('click', () => {
            this.showScreen('loading-screen');
        });

        // Add event listeners for report loading functionality
        document.getElementById('load-report-btn')?.addEventListener('click', () => {
            this.loadSelectedReport();
        });

        // Add event listener for file input change
        document.getElementById('report-file-input')?.addEventListener('change', (event) => {
            this.handleReportFileSelection(event);
        });

        // Навигация по форме
        const previewButton = document.getElementById('preview-button');
        if (previewButton) {
            console.log('Preview button found, adding event listener');
            previewButton.addEventListener('click', () => this.showPreview());
        } else {
            console.error('Preview button NOT found!');
        }

        document.getElementById('save-draft')?.addEventListener('click', () => this.saveDraft());

        const backButton = document.getElementById('back-to-reports');
        if (backButton) {
            console.log('Form back button found, adding event listener');
            backButton.addEventListener('click', () => {
                console.log('Form back button clicked');
                console.log('Current formOpenedFrom value:', this.formOpenedFrom);
                // If form was opened from retrospective, go back to retrospective screen
                if (this.formOpenedFrom === 'retrospective') {
                    console.log('Navigating to retrospective screen');
                    this.showScreen('retrospective-screen');
                } else {
                    console.log('Navigating to main screen');
                    this.showScreen('main-screen');
                }
            });
        } else {
            console.error('Form back button NOT found!');
        }

        // Предпросмотр
        document.getElementById('edit-form')?.addEventListener('click', () => this.editForm());
        document.getElementById('save-final')?.addEventListener('click', () => this.saveReportAsJSON());
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-word')?.addEventListener('click', () => this.exportToWord());
        document.getElementById('submit-form')?.addEventListener('click', () => this.submitForm());

        document.getElementById('retrospective-button')?.addEventListener('click', () => this.showRetrospective());

        // Full report functionality
        document.getElementById('browse-full-report-folder-btn')?.addEventListener('click', async () => {
            await this.browseFullReportFolder();
        });

        // Download test reports functionality
        document.getElementById('download-test-reports-btn')?.addEventListener('click', () => {
            this.downloadAllTestReports();
        });

        // Модальные окна
        document.querySelector('.modal-close')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideModal());
        document.getElementById('modal-confirm')?.addEventListener('click', () => this.confirmModalAction());

        // Обработка файлов
        document.getElementById('attachments')?.addEventListener('change', (e) => this.handleFileSelection(e));

        // Добавление строк в таблицу аварийных ситуаций
        document.getElementById('add-emergency')?.addEventListener('click', () => this.addEmergencyRow());
        // Удаление строк из таблицы аварийных ситуаций
        document.getElementById('delete-emergency')?.addEventListener('click', () => this.deleteEmergencyRow());

        // Add event listener for emergency table cells
        document.getElementById('emergency-situations')?.addEventListener('click', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement && target.tagName === 'INPUT' &&
                (target.name === 'emergencyEquipment[]' ||
                    target.name === 'emergencyDescription[]' ||
                    target.name === 'emergencyActions[]')) {
                this.showTextareaPopup(target);
            }
        });

        // Предотвращение потери данных при закрытии
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });
    }

    updateFormSections(formType) {
        // Hide all specialized sections
        const sections = [
            'teploelektracentral-section',
            'stokovye_vody-section',
            'parosilovoe_hozyaystvo-section',
            'elektroremontnyi_ceh-section',
            'teploelektracentral-shift-supervisor'
        ];

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Show the appropriate section based on form type
        let sectionToShow = '';
        switch (formType) {
            case 'teploelektracentral':
                sectionToShow = 'teploelektracentral-section';
                document.getElementById('teploelektracentral-shift-supervisor').style.display = 'block';
                break;
            case 'stokovye_vody':
                sectionToShow = 'stokovye_vody-section';
                break;
            case 'parosilovoe_hozyaystvo':
                sectionToShow = 'parosilovoe_hozyaystvo-section';
                break;
            case 'elektroremontnyi_ceh':
                sectionToShow = 'elektroremontnyi_ceh-section';
                break;
        }

        const section = document.getElementById(sectionToShow);
        if (section) {
            section.style.display = 'block';
        }
    }

    authenticate() {
        const usernameElement = document.getElementById('username');
        const passwordElement = document.getElementById('password');

        if (!(usernameElement instanceof HTMLInputElement) || !(passwordElement instanceof HTMLInputElement)) {
            return;
        }

        const username = usernameElement.value;
        const password = passwordElement.value;
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.classList.remove('show'));

        if (!username || !password) {
            this.showFieldError(usernameElement, 'Заполните все поля');
            return;
        }

        const department = this.departments[this.selectedForm];
        if (department && department.users[username] && department.users[username] === password) {
            this.authenticated = true;
            // Проверяем наличие сохраненных черновиков
            this.checkForDrafts();
        } else {
            this.showFieldError(usernameElement, 'Неверный логин или пароль');
        }
    }

    collectTeploelektracentralData(formData) {
        const fields = [
            'reactor1', 'reactor2', 'reactorSum', 'gasMeter', 'gasConsumption',
            'kgu', 'boiler1', 'boiler2', 'boiler3', 'steamConsumption',
            'woodChips', 'bark', 'sawdust', 'waterConsumption', 'waterLevel', 'waterReserve'
        ];

        fields.forEach(fieldName => {
            const element = document.getElementById(fieldName);
            if (element instanceof HTMLInputElement) {
                formData[fieldName] = element.value;
            }
        });
    }

    collectStokovyeVodyData(formData) {
        const fields = [
            'morningSuspended', 'daySuspended', 'eveningSuspended',
            'sedimentDay', 'sedimentNight',
            'waterHardness', 'waterTurbidity', 'waterColor', 'waterTemperature'
        ];

        fields.forEach(fieldName => {
            const element = document.getElementById(fieldName);
            if (element instanceof HTMLInputElement) {
                formData[fieldName] = element.value;
            }
        });
    }

    populateForm() {
        console.log('Восстановление формы с данными:', this.formData);
        Object.keys(this.formData).forEach(key => {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
                console.log(`Восстановление элемента ${key} с значением:`, this.formData[key]);
                if (element.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${this.formData[key]}"]`);
                    if (radio instanceof HTMLInputElement) {
                        radio.checked = true;
                        console.log(`Установлено значение радио-кнопки ${key}:`, this.formData[key]);
                    }
                } else if (element.type === 'checkbox') {
                    if (element instanceof HTMLInputElement) {
                        element.checked = this.formData[key];
                        console.log(`Установлено значение чекбокса ${key}:`, this.formData[key]);
                    }
                } else if (element.type === 'date') {
                    // Handle date inputs
                    if (this.formData[key]) {
                        // Convert dd.mm.yyyy format to yyyy-mm-dd for date inputs
                        const dateParts = this.formData[key].split('.');
                        if (dateParts.length === 3) {
                            const pad = (num) => num < 10 ? '0' + num : num;
                            const formattedDate = `${dateParts[2]}-${pad(dateParts[1])}-${pad(dateParts[0])}`;
                            element.value = formattedDate;
                            console.log(`Установлено значение даты ${key}:`, formattedDate);
                        }
                    }
                } else if (element.type === 'datetime-local') {
                    // Handle datetime-local inputs
                    if (this.formData[key]) {
                        // Convert dd.mm.yyyy hh:mm format to yyyy-mm-ddThh:mm for datetime-local inputs
                        const dateTimeParts = this.formData[key].split(' ');
                        if (dateTimeParts.length === 2) {
                            const dateParts = dateTimeParts[0].split('.');
                            if (dateParts.length === 3) {
                                const pad = (num) => num < 10 ? '0' + num : num;
                                const formattedDateTime = `${dateParts[2]}-${pad(dateParts[1])}-${pad(dateParts[0])}T${dateTimeParts[1]}`;
                                element.value = formattedDateTime;
                                console.log(`Установлено значение даты и времени ${key}:`, formattedDateTime);
                            }
                        }
                    }
                } else {
                    element.value = this.formData[key];
                    console.log(`Установлено значение поля ${key}:`, this.formData[key]);
                }
            } else {
                console.log(`Элемент не найден или неподдерживаемого типа для ключа: ${key}`);
            }
        });

        // Восстанавливаем файлы
        if (this.formData.attachments) {
            this.displayFileList(this.formData.attachments);
        }

        // Восстанавливаем аварийные ситуации
        if (this.formData.emergencySituations && this.formData.emergencySituations.length > 0) {
            const tbody = document.getElementById('emergency-situations');
            if (tbody) {
                // Clear existing rows except the first one
                tbody.innerHTML = '';

                // Add rows for each emergency situation
                this.formData.emergencySituations.forEach((situation, index) => {
                    // Create a new row with the emergency situation data
                    const newRow = document.createElement('tr');

                    // Format the data properly for display
                    const equipmentValue = situation.equipment ? situation.equipment.replace(/\\n/g, ' ') : '';
                    const descriptionValue = situation.description ? situation.description.replace(/\\n/g, ' ') : '';
                    const actionsValue = situation.actions ? situation.actions.replace(/\\n/g, ' ') : '';

                    // Store the actual values with escaped newlines in data attributes
                    const equipmentDataValue = situation.equipment ? situation.equipment.replace(/\n/g, '\\n') : '';
                    const descriptionDataValue = situation.description ? situation.description.replace(/\n/g, '\\n') : '';
                    const actionsDataValue = situation.actions ? situation.actions.replace(/\n/g, '\\n') : '';

                    newRow.innerHTML = `
                        <td><input type="text" name="emergencyTime[]" value="${situation.time || ''}"></td>
                        <td><input type="text" name="emergencyEquipment[]" value="${equipmentValue}" data-value="${equipmentDataValue}"></td>
                        <td><input type="text" name="emergencyDescription[]" value="${descriptionValue}" data-value="${descriptionDataValue}"></td>
                        <td><input type="text" name="emergencyActions[]" value="${actionsValue}" data-value="${actionsDataValue}"></td>
                        <td><input type="text" name="emergencyRecovery[]" value="${situation.recovery || ''}"></td>
                    `;

                    tbody.appendChild(newRow);
                });
            }
        }

        // Show/hide form sections based on form type
        if (this.selectedForm) {
            this.updateFormSections(this.selectedForm);
        }
        console.log('Форма восстановлена');
    }

    async checkForDrafts() {
        try {
            console.log('Проверка черновиков...');
            const drafts = await window.storageAdapter.getAllItems();
            console.log('Найдено элементов:', drafts.length);

            // Log all drafts for debugging
            console.log('Все черновики:', drafts);

            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Get the postfix for the current form type
            const currentPostfix = formPostfixes[this.selectedForm] || '';
            console.log('Текущий тип формы:', this.selectedForm);
            console.log('Требуемый постфикс:', currentPostfix);

            // Filter drafts by status, formType, and postfix
            const activeDrafts = drafts.filter(draft => {
                const matchesStatus = draft.status === 'draft';
                const matchesFormType = draft.formType === this.selectedForm;
                const matchesPostfix = currentPostfix === '' || (draft.id && draft.id.includes(currentPostfix));

                console.log('Проверка черновика:', draft.id, {
                    status: draft.status,
                    formType: draft.formType,
                    id: draft.id,
                    matchesStatus,
                    matchesFormType,
                    matchesPostfix,
                    shouldInclude: matchesStatus && matchesFormType && matchesPostfix
                });

                return matchesStatus && matchesFormType && matchesPostfix;
            });
            console.log('Активных черновиков:', activeDrafts.length);

            if (activeDrafts.length > 0) {
                // Берем самый свежий черновик
                const latestDraft = activeDrafts.sort((a, b) => {
                    const dateA = new Date(b.updatedAt || b.createdAt);
                    const dateB = new Date(a.updatedAt || a.createdAt);
                    return dateA.getTime() - dateB.getTime();
                })[0];

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

        // Create draft detection element dynamically
        const draftContainer = document.getElementById('draft-container');
        // Clear any existing content to avoid duplicate elements
        draftContainer.innerHTML = '';

        const draftDetectionElement = document.createElement('div');
        draftDetectionElement.id = 'draft-detection';
        draftDetectionElement.className = 'draft-options';
        draftDetectionElement.innerHTML = `
            <p class="draft-found">Найден незавершенный черновик от <span id="draft-date">${draftDate}</span></p>
            <div class="button-group">
                <button id="restore-draft" class="btn btn-primary">Восстановить черновик</button>
                <button id="start-new" class="btn btn-secondary">Начать новый</button>
            </div>
        `;

        draftContainer.appendChild(draftDetectionElement);

        // Add event listeners to the newly created buttons
        const restoreButton = document.getElementById('restore-draft');
        const startNewButton = document.getElementById('start-new');

        // Remove any existing event listeners to prevent duplicates
        const newRestoreButton = restoreButton.cloneNode(true);
        restoreButton.parentNode.replaceChild(newRestoreButton, restoreButton);

        const newStartNewButton = startNewButton.cloneNode(true);
        startNewButton.parentNode.replaceChild(newStartNewButton, startNewButton);

        // Add event listeners
        newRestoreButton.addEventListener('click', () => {
            console.log('Восстановление черновика...');
            this.restoreDraft();
        });

        newStartNewButton.addEventListener('click', () => {
            console.log('Начать новую форму...');
            // Show confirmation modal before starting new form
            this.showModal(
                'Подтверждение начала новой формы',
                'Вы уверены, что хотите начать новую форму? Все несохраненные данные будут потеряны.',
                () => {
                    this.startNewForm();
                }
            );
        });

        // Hide the 'Заполнить отчет' button when a draft is found
        const startFormButton = document.getElementById('start-form');
        if (startFormButton) {
            startFormButton.style.display = 'none';
        }

        this.latestDraftId = draft.id;
        this.showScreen('loading-screen');
    }

    showNoDraft() {
        console.log('Показываем кнопку новой формы');

        // Clear any existing draft detection element
        const draftContainer = document.getElementById('draft-container');
        draftContainer.innerHTML = '';

        const noDraftElement = document.getElementById('no-draft');
        if (noDraftElement) {
            noDraftElement.style.display = 'block';
            console.log('Кнопка стала видимой');
        } else {
            console.error('Элемент no-draft не найден!');
        }

        // Show the 'Заполнить отчет' кнопку когда нет черновика
        const startFormButton = document.getElementById('start-form');
        if (startFormButton) {
            startFormButton.style.display = 'inline-block';
        }

        this.showScreen('loading-screen');
    }

    async restoreDraft() {
        try {
            console.log('Восстановление черновика с ID:', this.latestDraftId);
            const draft = await window.storageAdapter.getItem(this.latestDraftId);
            console.log('Полученные данные черновика:', draft);
            if (draft) {
                this.currentDraftId = this.latestDraftId;
                this.formData = draft.form || {};
                console.log('Данные формы для восстановления:', this.formData);
                this.formOpenedFrom = null; // Reset the source
                this.populateForm();
                this.showFormScreen();
                this.isDirty = false;
                console.log('Черновик восстановлен');
            } else {
                console.log('Черновик не найден');
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
        this.isDirty = false;
        this.formOpenedFrom = null; // Reset the source

        // Clear department-specific localStorage entries
        this.clearDepartmentDraftsFromLocalStorage();

        // Clear all form fields including date fields
        const formElements = document.querySelectorAll('#main-form input, #main-form select, #main-form textarea');
        formElements.forEach(element => {
            if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                if (element.type === 'radio') {
                    if (element instanceof HTMLInputElement) element.checked = false;
                } else if (element.type === 'checkbox') {
                    if (element instanceof HTMLInputElement) element.checked = false;
                } else if (element.type !== 'file') {
                    element.value = '';
                }
            }
        });

        // Clear emergency situations table
        const emergencyTable = document.getElementById('emergency-situations');
        if (emergencyTable) {
            // Keep only the first row and clear its content
            const rows = emergencyTable.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
                emergencyTable.removeChild(rows[i]);
            }
            // Clear the first row
            const firstRowInputs = rows[0].querySelectorAll('input');
            firstRowInputs.forEach(input => {
                if (input instanceof HTMLInputElement) {
                    input.value = '';
                }
            });
        }

        // Clear file attachments
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
        }
        this.formData.attachments = [];

        this.showFormScreen();
        console.log('Новая форма запущена');
    }

    collectFormData() {
        const formElements = document.querySelectorAll('#main-form input, #main-form select, #main-form textarea');
        const data = {};

        formElements.forEach(element => {
            if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                const name = element.name || element.id;
                if (name) {
                    if (element.type === 'radio') {
                        if (element instanceof HTMLInputElement && element.checked) {
                            data[name] = element.value;
                        }
                    } else if (element.type === 'checkbox') {
                        if (element instanceof HTMLInputElement) {
                            data[name] = element.checked;
                        }
                    } else if (element.type === 'date') {
                        // Handle date inputs - convert yyyy-mm-dd to dd.mm.yyyy
                        if (element.value) {
                            const date = new Date(element.value);
                            const pad = (num) => num < 10 ? '0' + num : num;
                            const day = pad(date.getDate());
                            const month = pad(date.getMonth() + 1);
                            const year = date.getFullYear();
                            const formattedDate = `${day}.${month}.${year}`;
                            data[name] = formattedDate;
                        } else {
                            data[name] = '';
                        }
                    } else if (element.type === 'datetime-local') {
                        // Handle datetime-local inputs - convert yyyy-mm-ddThh:mm to dd.mm.yyyy hh:mm
                        if (element.value) {
                            const [datePart, timePart] = element.value.split('T');
                            const [year, month, day] = datePart.split('-');
                            const formattedDateTime = `${day}.${month}.${year} ${timePart}`;
                            data[name] = formattedDateTime;
                        } else {
                            data[name] = '';
                        }
                    } else if (element.type !== 'file') {
                        data[name] = element.value;
                    }
                }
            }
        });

        // Сохраняем файлы отдельно
        if (this.formData.attachments) {
            data.attachments = this.formData.attachments;
        }

        // Собираем данные из таблицы аварийных ситуаций
        const emergencyRows = document.querySelectorAll('#emergency-situations tr');
        const emergencyData = [];
        emergencyRows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length === 5) {
                // Use dataset.value if available, otherwise use the input value
                const equipmentValue = inputs[1].dataset.value ? inputs[1].dataset.value : inputs[1].value;
                const descriptionValue = inputs[2].dataset.value ? inputs[2].dataset.value : inputs[2].value;
                const actionsValue = inputs[3].dataset.value ? inputs[3].dataset.value : inputs[3].value;

                emergencyData.push({
                    time: inputs[0].value,
                    equipment: equipmentValue.replace(/\\n/g, '\n'), // Convert escaped newlines back to actual newlines
                    description: descriptionValue.replace(/\\n/g, '\n'),
                    actions: actionsValue.replace(/\\n/g, '\n'),
                    recovery: inputs[4].value
                });
            }
        });
        data.emergencySituations = emergencyData;

        return data;
    }

    validateForm() {
        console.log('Validating form');
        const requiredFields = document.querySelectorAll('#main-form [required]');
        console.log('Found required fields:', requiredFields.length);
        let isValid = true;

        // Очищаем предыдущие ошибки
        document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

        requiredFields.forEach(field => {
            let hasValue = false;

            if (field instanceof HTMLInputElement && field.type === 'radio') {
                const radioGroup = document.querySelectorAll(`[name="${field.name}"]`);
                hasValue = Array.from(radioGroup).some(radio => radio instanceof HTMLInputElement && radio.checked);
            } else if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
                hasValue = field.value.trim() !== '';
            }

            if (!hasValue) {
                console.log('Field missing value:', field.name || field.id);
                this.showFieldError(field, 'Это поле обязательно для заполнения');
                isValid = false;
            }
        });

        console.log('Form validation result:', isValid);
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

    showPreview() {
        console.log('Preview button clicked, showPreview called');
        if (!this.validateForm()) {
            console.log('Form validation failed');
            return;
        }

        this.formData = { ...this.formData, ...this.collectFormData() };
        this.generatePreview();
        this.showScreen('preview-screen');
        console.log('Preview screen shown');
    }

    addEmergencyRow(situation = null) {
        const tbody = document.getElementById('emergency-situations');
        const newRow = document.createElement('tr');

        if (situation) {
            // Format the data properly for display
            const equipmentValue = situation.equipment ? situation.equipment.replace(/\\n/g, ' ') : '';
            const descriptionValue = situation.description ? situation.description.replace(/\\n/g, ' ') : '';
            const actionsValue = situation.actions ? situation.actions.replace(/\\n/g, ' ') : '';

            // Store the actual values with escaped newlines in data attributes
            const equipmentDataValue = situation.equipment ? situation.equipment.replace(/\n/g, '\\n') : '';
            const descriptionDataValue = situation.description ? situation.description.replace(/\n/g, '\\n') : '';
            const actionsDataValue = situation.actions ? situation.actions.replace(/\n/g, '\\n') : '';

            newRow.innerHTML = `
                <td><input type="text" name="emergencyTime[]" value="${situation.time || ''}"></td>
                <td><input type="text" name="emergencyEquipment[]" value="${equipmentValue}" data-value="${equipmentDataValue}"></td>
                <td><input type="text" name="emergencyDescription[]" value="${descriptionValue}" data-value="${descriptionDataValue}"></td>
                <td><input type="text" name="emergencyActions[]" value="${actionsValue}" data-value="${actionsDataValue}"></td>
                <td><input type="text" name="emergencyRecovery[]" value="${situation.recovery || ''}"></td>
            `;
        } else {
            newRow.innerHTML = `
                <td><input type="text" name="emergencyTime[]"></td>
                <td><input type="text" name="emergencyEquipment[]"></td>
                <td><input type="text" name="emergencyDescription[]"></td>
                <td><input type="text" name="emergencyActions[]"></td>
                <td><input type="text" name="emergencyRecovery[]"></td>
            `;
        }

        tbody.appendChild(newRow);

        // Apply white-space styling to preserve line breaks in the new inputs
        const inputs = newRow.querySelectorAll('input');
        inputs.forEach(input => {
            input.style.whiteSpace = 'pre-wrap';
        });
    }

    deleteEmergencyRow() {
        const tbody = document.getElementById('emergency-situations');
        const rows = tbody.querySelectorAll('tr');

        // Check if there are rows to delete
        if (rows.length === 0) {
            this.showMessage('Нет строк для удаления', 'info');
            return;
        }

        // Check if the last row has any content
        const lastRow = rows[rows.length - 1];
        const inputs = lastRow.querySelectorAll('input');
        let hasContent = false;

        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                hasContent = true;
            }
        });

        // If the row has content, show confirmation dialog
        if (hasContent) {
            this.showModal(
                'Подтверждение удаления',
                'В строке есть данные. Вы уверены, что хотите удалить эту строку?',
                () => {
                    tbody.removeChild(lastRow);
                    this.isDirty = true;
                }
            );
        } else {
            // If the row is empty, just delete it
            tbody.removeChild(lastRow);
            this.isDirty = true;
        }
    }

    showTextareaPopup(inputElement) {
        // Create modal overlay if it doesn't exist
        let modalOverlay = document.getElementById('textarea-modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'textarea-modal-overlay';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Редактирование</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <textarea id="textarea-popup" style="width: 100%; height: 200px; font-family: Arial, sans-serif; font-size: 16px; white-space: pre-wrap;"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button id="textarea-cancel" class="btn btn-secondary">Отмена</button>
                        <button id="textarea-save" class="btn btn-primary">Сохранить</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);

            // Add event listeners for modal
            const modalClose = modalOverlay.querySelector('.modal-close');
            const textareaCancel = modalOverlay.querySelector('#textarea-cancel');

            if (modalClose) {
                modalClose.addEventListener('click', () => this.hideTextareaModal());
            }

            if (textareaCancel) {
                textareaCancel.addEventListener('click', () => this.hideTextareaModal());
            }
        }

        // Set the textarea value to the input value
        const textarea = modalOverlay.querySelector('#textarea-popup');
        if (textarea instanceof HTMLTextAreaElement) {
            // Convert escaped newlines back to actual newlines for display in textarea
            let displayValue = '';
            if (inputElement instanceof HTMLInputElement && inputElement.value) {
                displayValue = inputElement.value;
                if (inputElement.dataset.value) {
                    displayValue = inputElement.dataset.value.replace(/\\n/g, '\n');
                } else {
                    displayValue = inputElement.value.replace(/\\n/g, '\n');
                }
            }
            textarea.value = displayValue;
        }

        // Store reference to the input element
        this.currentEditingInput = inputElement;

        // Update the save button event listener with the current input element
        const saveButton = modalOverlay.querySelector('#textarea-save');
        if (saveButton) {
            // Remove any existing event listener
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            // Add new event listener with current input element
            newSaveButton.addEventListener('click', () => this.saveTextareaContent(this.currentEditingInput));
        }

        // Show the modal
        modalOverlay.classList.add('active');
    }

    hideTextareaModal() {
        const modalOverlay = document.getElementById('textarea-modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
        this.currentEditingInput = null;
    }

    saveTextareaContent(inputElement) {
        const modalOverlay = document.getElementById('textarea-modal-overlay');
        const textarea = modalOverlay?.querySelector('#textarea-popup');

        // Check if inputElement is valid
        if (!inputElement) {
            console.error('No input element provided to save content to');
            this.hideTextareaModal();
            return;
        }

        // Store the actual value with escaped newlines in a data attribute
        if (textarea instanceof HTMLTextAreaElement) {
            const escapedValue = textarea.value.replace(/\n/g, '\\n');
            if (inputElement instanceof HTMLInputElement) {
                inputElement.dataset.value = escapedValue;

                // For display purposes, show a simplified version in the input field
                inputElement.value = textarea.value.replace(/\n/g, ' ');

                // Also update the display to show line breaks properly
                inputElement.style.whiteSpace = 'pre-wrap';
            }
        }

        // Mark form as dirty
        this.isDirty = true;

        // Hide the modal
        this.hideTextareaModal();
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
        // Check if the file list element exists before trying to manipulate it
        if (fileList) {
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
                this.currentDraftId = window.storageAdapter.generateId(this.selectedForm);
            }

            const currentData = this.collectFormData();
            this.formData = { ...this.formData, ...currentData };

            const draftData = {
                id: this.currentDraftId,
                status: 'draft',
                formType: this.selectedForm,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
        if (!statusElement) return;

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

    generatePreview() {
        const previewHeader = document.getElementById('preview-header');
        const previewContent = document.getElementById('preview-content');
        const department = this.departments[this.selectedForm];

        // Set the report title in the header
        previewHeader.innerHTML = `
            <div class="report-header">
                <div class="report-title">ОТЧЁТ О РАБОТЕ ${department.name} ЗА СУТКИ</div>
            </div>
        `;

        // Форматируем даты для отображения
        const reportDate = this.formData.reportDate || '___  ___  _____';
        const periodStart = this.formData.periodStart || '___  ___  _____';
        const periodEnd = this.formData.periodEnd || '___  ___  _____';

        // Generate preview content based on form type
        switch (this.selectedForm) {
            case 'teploelektracentral':
                this.generateTeploelektracentralPreview(previewContent, reportDate, periodStart, periodEnd);
                break;
            case 'stokovye_vody':
                this.generateStokovyeVodyPreview(previewContent, reportDate, periodStart, periodEnd);
                break;
            case 'parosilovoe_hozyaystvo':
                this.generateParosilovoeHozyaystvoPreview(previewContent, reportDate, periodStart, periodEnd);
                break;
            case 'elektroremontnyi_ceh':
                this.generateElektroremontnyiCehPreview(previewContent, reportDate, periodStart, periodEnd);
                break;
        }
    }
    generateTeploelektracentralPreview(previewContent, reportDate, periodStart, periodEnd) {
        previewContent.innerHTML = `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${this.formData.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${this.formData.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Начальник смены ТЭЦ:</span>
                    <span class="field-value">${this.formData.shiftSupervisor || '_________________'}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Общие показатели работы ТЭЦ</h3>
                <div class="report-field">
                    <span class="field-label">Выработка электроэнергии:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт 1</span>
                    <span class="field-value">${this.formData.reactor1 || '__________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт 2</span>
                    <span class="field-value">${this.formData.reactor2 || '__________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт сумма</span>
                    <span class="field-value">${this.formData.reactorSum || '_________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Показания газового счетчика на 8-00</span>
                    <span class="field-value">${this.formData.gasMeter || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Потребление газа за сутки</span>
                    <span class="field-value">${this.formData.gasConsumption || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Производство пара:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">КГУ</span>
                    <span class="field-value">${this.formData.kgu || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №1, котел №1</span>
                    <span class="field-value">${this.formData.boiler1 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №1, котел №2</span>
                    <span class="field-value">${this.formData.boiler2 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №3</span>
                    <span class="field-value">${this.formData.boiler3 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Потребление пара: БДМ-1</span>
                    <span class="field-value">${this.formData.steamConsumption || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Расход топлива:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">щепа</span>
                    <span class="field-value">${this.formData.woodChips || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">кора</span>
                    <span class="field-value">${this.formData.bark || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">опилки</span>
                    <span class="field-value">${this.formData.sawdust || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Расход воды: Станция обезжелезивания</span>
                    <span class="field-value">${this.formData.waterConsumption || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Уровень воды: Станция обезжелезивания</span>
                    <span class="field-value">${this.formData.waterLevel || '_____'} %</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Запасно-регулирующие резервуары водоснабжения</span>
                    <span class="field-value">${this.formData.waterReserve || '_____'} %</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreview()}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${this.formData.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    generateStokovyeVodyPreview(previewContent, reportDate, periodStart, periodEnd) {
        previewContent.innerHTML = `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${this.formData.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${this.formData.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (утро)</span>
                    <span class="field-value">${this.formData.morningSuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (день)</span>
                    <span class="field-value">${this.formData.daySuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (вечер)</span>
                    <span class="field-value">${this.formData.eveningSuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём обезвоженных осадков, (08:00 - 20:00)</span>
                    <span class="field-value">${this.formData.sedimentDay || '_____'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём обезвоженных осадков, (20:00 - 08:00)</span>
                    <span class="field-value">${this.formData.sedimentNight || '_____'} т.</span>
                </div>
                
                <div class="report-field">
                    <span class="field-label">Показатели технической воды: жесткость</span>
                    <span class="field-value">${this.formData.waterHardness || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">мутность</span>
                    <span class="field-value">${this.formData.waterTurbidity || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">цветность</span>
                    <span class="field-value">${this.formData.waterColor || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">температура</span>
                    <span class="field-value">${this.formData.waterTemperature || '_____'}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreview()}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${this.formData.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    generateParosilovoeHozyaystvoPreview(previewContent, reportDate, periodStart, periodEnd) {
        previewContent.innerHTML = `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${this.formData.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${this.formData.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreview()}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${this.formData.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    generateElektroremontnyiCehPreview(previewContent, reportDate, periodStart, periodEnd) {
        previewContent.innerHTML = `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${this.formData.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${this.formData.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreview()}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${this.formData.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    generateEmergencyTablePreview() {
        if (!this.formData.emergencySituations || this.formData.emergencySituations.length === 0) {
            return `
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }

        return this.formData.emergencySituations.map(situation => `
            <tr>
                <td style="white-space: pre-wrap;">${situation.time || ''}</td>
                <td style="white-space: pre-wrap;">${situation.equipment || ''}</td>
                <td style="white-space: pre-wrap;">${situation.description || ''}</td>
                <td style="white-space: pre-wrap;">${situation.actions || ''}</td>
                <td style="white-space: pre-wrap;">${situation.recovery || ''}</td>
            </tr>
        `).join('');
    }

    editForm() {
        this.showScreen('form-screen');
    }

    async exportToPDF() {
        try {
            // Make sure the preview is up to date with current form data
            this.formData = { ...this.formData, ...this.collectFormData() };
            this.generatePreview();

            const element = document.getElementById('preview-content');
            const headerElement = document.getElementById('preview-header');

            // Create a wrapper element that includes both header and content
            const wrapper = document.createElement('div');
            wrapper.appendChild(headerElement.cloneNode(true));
            wrapper.appendChild(element.cloneNode(true));

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');

            const filename = `Отчет_${this.departments[this.selectedForm].name}_${year}-${month}-${date}.pdf`;

            const opt = {
                margin: [10, 5, 10, 5], // Reduced margins: [top, right, bottom, left]
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.before-page-break',
                    after: '.after-page-break',
                    avoid: '.avoid-page-break'
                }
            };

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportPDFWithFileSystemAPI(wrapper, opt, filename);
            } else {
                // Fallback to traditional method
                await html2pdf().set(opt).from(wrapper).save();
            }

            console.log('PDF экспортирован успешно');
        } catch (error) {
            console.error('Ошибка экспорта PDF:', error);
            this.showMessage('Ошибка экспорта в PDF. Попробуйте еще раз.', 'error');
        }
    }

    // Export PDF using File System Access API
    async exportPDFWithFileSystemAPI(wrapper, opt, filename) {
        try {
            // Generate PDF as blob
            const pdfBlob = await html2pdf().set(opt).from(wrapper).outputPdf('blob');

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'PDF файлы отчетов',
                    accept: {
                        'application/pdf': ['.pdf']
                    }
                }]
            });

            // Create a FileSystemWritableFileStream to write to
            const writable = await fileHandle.createWritable();

            // Write the contents of the file to the stream
            await writable.write(pdfBlob);

            // Close the file and write the contents to disk
            await writable.close();
        } catch (error) {
            // If user cancelled the save dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            // For other errors, fall back to traditional method
            console.warn('File System Access API недоступен, используем традиционный метод экспорта:', error);
            await html2pdf().set(opt).from(wrapper).save();
        }
    }

    // Save report using File System Access API
    async saveReportWithFileSystemAPI(filename, content, year, month) {
        try {
            // Create suggested file name with folder structure simulation
            const suggestedName = "Отчеты / " + year + "-" + month + "/" + filename;

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'JSON файлы отчетов',
                    accept: {
                        'application/json': ['.json']
                    }
                }]
            });

            // Create a FileSystemWritableFileStream to write to
            const writable = await fileHandle.createWritable();

            // Write the contents of the file to the stream
            await writable.write(content);

            // Close the file and write the contents to disk
            await writable.close();
        } catch (error) {
            // If user cancelled the save dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            // For other errors, fall back to traditional download method
            console.warn('File System Access API недоступен, используем традиционный метод загрузки:', error);
            await this.saveReportWithDownload(filename, content);
        }
    }

    // Export full report to PDF
    async exportFullReportToPDF(reportsByDepartment) {
        try {
            // Create a temporary element for the full report
            const reportElement = document.querySelector('.combined-report-preview');
            if (!reportElement) {
                throw new Error('Элемент отчета не найден');
            }

            // Clone the element to avoid modifying the original
            const clonedElement = reportElement.cloneNode(true);

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const filename = "Полный_отчет_" + year + "-" + month + "-" + date + "_" + hours + "-" + minutes + "-" + seconds + ".pdf";

            const opt = {
                margin: [10, 5, 10, 5], // Reduced margins: [top, right, bottom, left]
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.before-page-break',
                    after: '.after-page-break',
                    avoid: '.avoid-page-break'
                }
            };

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportPDFWithFileSystemAPI(clonedElement, opt, filename);
            } else {
                // Fallback to traditional method
                await html2pdf().set(opt).from(clonedElement).save();
            }

            console.log('Полный отчет экспортирован успешно');
            this.showMessage('Полный отчет успешно экспортирован в PDF!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта полного отчета в PDF:', error);
            this.showMessage('Ошибка экспорта полного отчета в PDF. Попробуйте еще раз.', 'error');
        }
    }

    // Export to Word functionality
    async exportToWord() {
        try {
            // Make sure the preview is up to date with current form data
            this.formData = { ...this.formData, ...this.collectFormData() };
            this.generatePreview();

            const element = document.getElementById('preview-content');
            const headerElement = document.getElementById('preview-header');

            // Create a wrapper element that includes both header and content
            const wrapper = document.createElement('div');
            wrapper.appendChild(headerElement.cloneNode(true));
            wrapper.appendChild(element.cloneNode(true));

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');

            const filename = "Отчет_" + this.departments[this.selectedForm].name + "_" + year + "-" + month + "-" + date + ".doc";

            // Get HTML content
            const htmlContent = wrapper.innerHTML;

            // Create a proper Word document structure with correct encoding and styles
            const wordContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
                    <head>
                        <meta charset='utf-8'>
                        <title>Отчет</title>
                        <style>
                            body {
                                font-family: 'Times New Roman', Times, serif;
                                font-size: 16px;
                                line-height: 1.2;
                                margin: 20px;
                            }
                            table {
                                border-collapse: collapse;
                                width: 100%;
                                table-layout: fixed;
                                word-wrap: break-word;
                                border-spacing: 0;
                                mso-table-layout-alt: fixed;
                                mso-table-overlap: never;
                            }
                            th, td {
                                border: 1px solid #000;
                                padding: 4px 6px;
                                text-align: left;
                                vertical-align: top;
                                word-wrap: break-word;
                                mso-border-alt: solid black .75pt;
                                mso-padding-alt: 4px 6px;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .emergency-table-preview {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                                table-layout: fixed;
                                font-family: 'Times New Roman', Times, serif;
                                font-size: 16px;
                                line-height: 1.2;
                                word-wrap: break-word;
                                border-spacing: 0;
                                mso-table-layout-alt: fixed;
                                mso-table-overlap: never;
                            }
                            .emergency-table-preview th,
                            .emergency-table-preview td {
                                border: 1px solid #000;
                                padding: 4px 6px;
                                text-align: left;
                                vertical-align: top;
                                word-wrap: break-word;
                                mso-border-alt: solid black .75pt;
                                mso-padding-alt: 4px 6px;
                            }
                            .report-section {
                                margin-bottom: 20px;
                                page-break-inside: avoid;
                            }
                            .report-field {
                                margin-bottom: 8px;
                                page-break-inside: avoid;
                            }
                            h3 {
                                page-break-after: avoid;
                            }
                            .report-header {
                                text-align: center;
                                margin-bottom: 20px;
                            }
                            .report-title {
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                </html>
            `;

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportWordWithFileSystemAPI(wordContent, filename);
            } else {
                // Fallback to traditional download method
                await this.exportWordWithDownload(wordContent, filename);
            }

            console.log('Word документ экспортирован успешно');
        } catch (error) {
            console.error('Ошибка экспорта Word:', error);
            this.showMessage('Ошибка экспорта в Word. Попробуйте еще раз.', 'error');
        }
    }

    // Export Word using File System Access API
    async exportWordWithFileSystemAPI(content, filename) {
        try {
            // Create blob
            const blob = new Blob([content], { type: 'application/msword' });

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Word документы',
                    accept: {
                        'application/msword': ['.doc']
                    }
                }]
            });

            // Create a FileSystemWritableFileStream to write to
            const writable = await fileHandle.createWritable();

            // Write the contents of the file to the stream
            await writable.write(blob);

            // Close the file and write the contents to disk
            await writable.close();
        } catch (error) {
            // If user cancelled the save dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            // For other errors, fall back to traditional method
            console.warn('File System Access API недоступен, используем традиционный метод экспорта:', error);
            await this.exportWordWithDownload(content, filename);
        }
    }

    // Export Word using traditional download method (fallback)
    async exportWordWithDownload(content, filename) {
        // Create blob and download
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Generate unique ID (UUID)
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Create report data structure according to requirements
    createReportData(version = 1) {
        const now = new Date();
        const reportData = {
            metadata: {
                date_created: now.toISOString(),
                last_modified: now.toISOString(),
                report_id: this.generateUUID(),
                version: version
            },
            data: this.formData
        };
        return reportData;
    }

    // Save report as JSON file
    async saveReportAsJSON() {
        try {
            // Collect current form data
            const currentData = this.collectFormData();
            this.formData = { ...this.formData, ...currentData };

            // Create report data structure
            // For now, we'll use version 1. In the future, we'll implement version checking
            const reportData = this.createReportData(1);

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Get the postfix for the current form type
            const postfix = formPostfixes[this.selectedForm] || '';

            const filename = "report_" + year + "-" + month + "-" + date + "_" + hours + "-" + minutes + "-" + seconds + postfix + ".json";

            const folderPath = "Отчеты / " + year + "-" + month + " ";

            // Create JSON content
            const jsonContent = JSON.stringify(reportData, null, 2);

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.saveReportWithFileSystemAPI(filename, jsonContent, year, month);
            } else {
                // Fallback to traditional download method
                await this.saveReportWithDownload(filename, jsonContent);
            }

            console.log('Отчет сохранен как JSON файл:', filename);

            // Clear localStorage after saving
            await this.clearLocalStorageAfterSave();

            this.showMessage('Отчет успешно сохранен!', 'success');

            // Navigate to the loading screen after successful save
            setTimeout(() => {
                this.showScreen('loading-screen');
                this.currentDraftId = null;
            }, 2000);
        } catch (error) {
            console.error('Ошибка сохранения отчета:', error);
            this.showMessage('Ошибка сохранения отчета. Попробуйте еще раз.', 'error');
        }
    }

    // Save report using File System Access API
    async saveReportWithFileSystemAPI(filename, content, year, month) {
        try {
            // Create directory if it doesn't exist
            const dirHandle = await window.showDirectoryPicker({
                suggestedName: "Отчеты / " + year + "-" + month + " "
            });

            // Create file handle for the report
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });

            // Create a FileSystemWritableFileStream to write to
            const writable = await fileHandle.createWritable();

            // Write the contents of the file to the stream
            await writable.write(content);

            // Close the file and write the contents to disk
            await writable.close();

            console.log('Отчет успешно сохранен:', filename);
        } catch (error) {
            // If user cancelled the dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            console.error('Ошибка сохранения отчета:', error);
            this.showMessage('Ошибка сохранения отчета. Попробуйте еще раз.', 'error');
        }
    }

    // Save report using traditional download method (fallback)
    async saveReportWithDownload(filename, content) {
        // Create blob and download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log('Отчет успешно сохранен:', filename);
    }



    // Authenticate for full report (admin only)
    authenticateFullReport() {
        const username = document.getElementById('full-report-username').value;
        const password = document.getElementById('full-report-password').value;
        const errorElements = document.querySelectorAll('#full-report-authentication-form .error-message');
        errorElements.forEach(el => el.classList.remove('show'));

        if (!username || !password) {
            // Find the error element for the first empty field
            if (!username) {
                this.showFieldError(document.getElementById('full-report-username'), 'Заполните все поля');
            }
            if (!password) {
                this.showFieldError(document.getElementById('full-report-password'), 'Заполните все поля');
            }
            return;
        }

        // Check if user is admin
        let isAdmin = false;
        for (const dept in this.departments) {
            if (this.departments[dept].users['admin'] && this.departments[dept].users['admin'] === password && username === 'admin') {
                isAdmin = true;
                break;
            }
        }

        if (isAdmin) {
            this.isAdminAuthenticated = true;
            // Show folder selection screen
            this.showScreen('full-report-folder-screen');
        } else {
            this.showFieldError(document.getElementById('full-report-username'), 'Неверный логин или пароль');
        }
    }

    // Browse folder for full report
    async browseFullReportFolder() {
        try {
            // Show directory picker
            const dirHandle = await window.showDirectoryPicker({
                mode: 'read'
            });

            // Display reports from the selected directory
            await this.displayFullReportFromDirectory(dirHandle);
        } catch (error) {
            // If user cancelled the dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            console.error('Ошибка выбора папки:', error);
            this.showMessage('Ошибка выбора папки. Попробуйте еще раз.', 'error');
        }
    }

    // Display reports from a directory for full report
    async displayFullReportFromDirectory(dirHandle) {
        try {
            const reportsDisplay = document.getElementById('full-report-display');
            reportsDisplay.innerHTML = '<p>Поиск отчетов...</p>';

            const reports = [];

            // Recursively search for JSON files in the directory
            await this.searchReportsInDirectory(dirHandle, reports);

            if (reports.length === 0) {
                reportsDisplay.innerHTML = '<p>В выбранной папке не найдено отчетов.</p>';
                return;
            }

            // Generate full report
            await this.generateFullReport(reports, reportsDisplay);
        } catch (error) {
            console.error('Ошибка формирования полного отчета:', error);
            const reportsDisplay = document.getElementById('full-report-display');
            reportsDisplay.innerHTML = '<p>Ошибка формирования полного отчета. Попробуйте еще раз.</p>';
        }
    }

    // Generate full report from individual reports
    async generateFullReport(reports, container) {
        try {
            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Group reports by department
            const reportsByDepartment = {};

            // Sort reports by date (newest first)
            reports.sort((a, b) => {
                try {
                    return new Date(b.metadata.last_modified || b.metadata.date_created) -
                        new Date(a.metadata.last_modified || a.metadata.date_created);
                } catch (error) {
                    return 0;
                }
            });

            // Process each report and group by department
            for (const report of reports) {
                // Determine which department this report belongs to based on postfix
                for (const [dept, postfix] of Object.entries(formPostfixes)) {
                    if (report.name.includes(postfix + '.json')) {
                        if (!reportsByDepartment[dept]) {
                            reportsByDepartment[dept] = report; // Keep only the latest report for each department
                        }
                        break;
                    }
                }
            }

            // Generate combined report HTML with proper page breaks for PDF
            let fullReportHTML = `
                <div class="combined-report-preview">
                    <div class="combined-report-header">
                        <h1 class="combined-report-title">ПОЛНЫЙ ОТЧЁТ О РАБОТЕ ПОДРАЗДЕЛЕНИЙ ЗА СУТКИ</h1>
                        <div class="combined-report-date">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
                    </div>
            `;

            // Add each department's report section in the same order as on the main page
            const departmentOrder = ['teploelektracentral', 'stokovye_vody', 'parosilovoe_hozyaystvo', 'elektroremontnyi_ceh'];

            for (const dept of departmentOrder) {
                if (reportsByDepartment[dept]) {
                    const report = reportsByDepartment[dept];
                    // Add page break class to all sections except the first one
                    const pageBreakClass = dept === 'teploelektracentral' ? '' : 'before-page-break';
                    fullReportHTML += `
                        <div class="full-report-section ${pageBreakClass}">
                            <div class="report-header">
                                <div class="report-title">ОТЧЁТ О РАБОТЕ ${this.departments[dept].name} ЗА СУТКИ</div>
                            </div>
                            <div class="preview-content">
                                ${this.generateDepartmentPreviewContent(report, dept)}
                            </div>
                        </div>
                    `;
                }
            }

            fullReportHTML += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="generate-full-report-pdf" class="btn btn-primary">Сформировать отчет в PDF</button>
                </div>
            `;

            container.innerHTML = fullReportHTML;

            // Add event listener for PDF generation
            document.getElementById('generate-full-report-pdf')?.addEventListener('click', async () => {
                await this.exportFullReportToPDF(reportsByDepartment);
            });

        } catch (error) {
            console.error('Ошибка генерации полного отчета:', error);
            container.innerHTML = '<p>Ошибка генерации полного отчета. Попробуйте еще раз.</p>';
        }
    }

    // Generate preview content for a department report (same as individual preview)
    generateDepartmentPreviewContent(report, department) {
        try {
            const data = report.data;

            // Format dates for display
            const reportDate = data.reportDate || '___  ___  _____';
            const periodStart = data.periodStart || '___  ___  _____';
            const periodEnd = data.periodEnd || '___  ___  _____';

            // Generate content based on department type
            switch (department) {
                case 'teploelektracentral':
                    return this.generateTeploelektracentralPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'stokovye_vody':
                    return this.generateStokovyeVodyPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'parosilovoe_hozyaystvo':
                    return this.generateParosilovoeHozyaystvoPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'elektroremontnyi_ceh':
                    return this.generateElektroremontnyiCehPreviewContent(data, reportDate, periodStart, periodEnd);
                default:
                    return '<p>Неизвестный тип отчета</p>';
            }
        } catch (error) {
            console.error('Ошибка генерации содержимого отчета отдела:', error);
            return '<p>Ошибка при формировании данных отдела</p>';
        }
    }

    // Generate Теплоэлектроцентраль preview content (same as individual preview)
    generateTeploelektracentralPreviewContent(data, reportDate, periodStart, periodEnd) {
        return `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${data.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${data.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Начальник смены ТЭЦ:</span>
                    <span class="field-value">${data.shiftSupervisor || '_________________'}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Общие показатели работы ТЭЦ</h3>
                <div class="report-field">
                    <span class="field-label">Выработка электроэнергии:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт 1</span>
                    <span class="field-value">${data.reactor1 || '__________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт 2</span>
                    <span class="field-value">${data.reactor2 || '__________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">Ракт сумма</span>
                    <span class="field-value">${data.reactorSum || '_________'} МВт·ч</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Показания газового счетчика на 8-00</span>
                    <span class="field-value">${data.gasMeter || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Потребление газа за сутки</span>
                    <span class="field-value">${data.gasConsumption || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Производство пара:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">КГУ</span>
                    <span class="field-value">${data.kgu || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №1, котел №1</span>
                    <span class="field-value">${data.boiler1 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №1, котел №2</span>
                    <span class="field-value">${data.boiler2 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 200px; margin-left: 50px;">Котельная №3</span>
                    <span class="field-value">${data.boiler3 || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Потребление пара: БДМ-1</span>
                    <span class="field-value">${data.steamConsumption || '__________'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Расход топлива:</span>
                    <span class="field-value"></span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">щепа</span>
                    <span class="field-value">${data.woodChips || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">кора</span>
                    <span class="field-value">${data.bark || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label" style="min-width: 100px; margin-left: 50px;">опилки</span>
                    <span class="field-value">${data.sawdust || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Расход воды: Станция обезжелезивания</span>
                    <span class="field-value">${data.waterConsumption || '__________'} м3</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Уровень воды: Станция обезжелезивания</span>
                    <span class="field-value">${data.waterLevel || '_____'} %</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Запасно-регулирующие резервуары водоснабжения</span>
                    <span class="field-value">${data.waterReserve || '_____'} %</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreviewForReport(data)}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${data.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    // Generate Участок сточных вод preview content (same as individual preview)
    generateStokovyeVodyPreviewContent(data, reportDate, periodStart, periodEnd) {
        return `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${data.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${data.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (утро)</span>
                    <span class="field-value">${data.morningSuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (день)</span>
                    <span class="field-value">${data.daySuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём взвешенных веществ, (вечер)</span>
                    <span class="field-value">${data.eveningSuspended || '_____'} мг/л</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём обезвоженных осадков, (08:00 - 20:00)</span>
                    <span class="field-value">${data.sedimentDay || '_____'} т.</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Объём обезвоженных осадков, (20:00 - 08:00)</span>
                    <span class="field-value">${data.sedimentNight || '_____'} т.</span>
                </div>
                
                <div class="report-field">
                    <span class="field-label">Показатели технической воды: жесткость</span>
                    <span class="field-value">${data.waterHardness || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">мутность</span>
                    <span class="field-value">${data.waterTurbidity || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">цветность</span>
                    <span class="field-value">${data.waterColor || '_____'}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">температура</span>
                    <span class="field-value">${data.waterTemperature || '_____'}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreviewForReport(data)}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${data.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    // Generate Паросиловое хозяйство preview content (same as individual preview)
    generateParosilovoeHozyaystvoPreviewContent(data, reportDate, periodStart, periodEnd) {
        return `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${data.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${data.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreviewForReport(data)}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${data.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    // Generate Электроремонтный цех preview content (same as individual preview)
    generateElektroremontnyiCehPreviewContent(data, reportDate, periodStart, periodEnd) {
        return `
            <div class="report-section">
                <div class="report-field">
                    <span class="field-label">Дата составления:</span>
                    <span class="field-value">${reportDate}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">Период: с ${data.startTime || '8-00'}</span>
                    <span class="field-value">${periodStart}</span>
                </div>
                <div class="report-field">
                    <span class="field-label">по ${data.endTime || '8-00'}</span>
                    <span class="field-value">${periodEnd}</span>
                </div>
            </div>

            <div class="report-section">
                <h3>Режим работы оборудования</h3>
                <div class="report-field vertical">
                    <span class="field-label">Аварийные ситуации:</span>
                    <table class="emergency-table-preview">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Наименование оборудования</th>
                                <th>Описание</th>
                                <th>Принятые меры</th>
                                <th>Дата и время восстановления</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateEmergencyTablePreviewForReport(data)}
                        </tbody>
                    </table>
                </div>
                <div class="report-field vertical">
                    <span class="field-label">Отклонения в работе оборудования, замечания:</span>
                    <span class="field-value equipment-deviations">${data.equipmentDeviations || ''}</span>
                </div>
            </div>
        `;
    }

    // Generate emergency table preview for a report
    generateEmergencyTablePreviewForReport(data) {
        if (!data.emergencySituations || data.emergencySituations.length === 0) {
            return `
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }

        return data.emergencySituations.map(situation => `
            <tr>
                <td style="white-space: pre-wrap;">${situation.time || ''}</td>
                <td style="white-space: pre-wrap;">${situation.equipment || ''}</td>
                <td style="white-space: pre-wrap;">${situation.description || ''}</td>
                <td style="white-space: pre-wrap;">${situation.actions || ''}</td>
                <td style="white-space: pre-wrap;">${situation.recovery || ''}</td>
            </tr>
        `).join('');
    }

    // Export full report to PDF
    async exportFullReportToPDF(reportsByDepartment) {
        try {
            // Create a temporary element for the full report
            const reportElement = document.querySelector('.combined-report-preview');
            if (!reportElement) {
                throw new Error('Элемент отчета не найден');
            }

            // Clone the element to avoid modifying the original
            const clonedElement = reportElement.cloneNode(true);

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const filename = `Полный_отчет_${year}-${month}-${date}_${hours}-${minutes}-${seconds}.pdf`;

            // Use the same PDF export settings as individual reports for consistency
            const opt = {
                margin: [10, 5, 10, 5], // Same margins as individual reports
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.before-page-break',
                    after: '.after-page-break',
                    avoid: '.avoid-page-break'
                }
            };

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportPDFWithFileSystemAPI(clonedElement, opt, filename);
            } else {
                // Fallback to traditional method
                await html2pdf().set(opt).from(clonedElement).save();
            }

            console.log('Полный отчет экспортирован успешно');
            this.showMessage('Полный отчет успешно экспортирован в PDF!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта полного отчета в PDF:', error);
            this.showMessage('Ошибка экспорта полного отчета в PDF. Попробуйте еще раз.', 'error');
        }
    }

    // Generate full report from individual reports
    async generateFullReport(reports, container) {
        try {
            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Group reports by department
            const reportsByDepartment = {};

            // Sort reports by date (newest first)
            reports.sort((a, b) => {
                try {
                    return new Date(b.metadata.last_modified || b.metadata.date_created) -
                        new Date(a.metadata.last_modified || a.metadata.date_created);
                } catch (error) {
                    return 0;
                }
            });

            // Process each report and group by department
            for (const report of reports) {
                // Determine which department this report belongs to based on postfix
                for (const [dept, postfix] of Object.entries(formPostfixes)) {
                    if (report.name.includes(postfix + '.json')) {
                        if (!reportsByDepartment[dept]) {
                            reportsByDepartment[dept] = report; // Keep only the latest report for each department
                        }
                        break;
                    }
                }
            }

            // Generate combined report HTML with proper page breaks for PDF
            let fullReportHTML = `
                <div class="combined-report-preview">
                    <div class="combined-report-header">
                        <h1 class="combined-report-title">ПОЛНЫЙ ОТЧЁТ О РАБОТЕ ПОДРАЗДЕЛЕНИЙ ЗА СУТКИ</h1>
                        <div class="combined-report-date">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
                    </div>
            `;

            // Add each department's report section in the same order as on the main page
            const departmentOrder = ['teploelektracentral', 'stokovye_vody', 'parosilovoe_hozyaystvo', 'elektroremontnyi_ceh'];

            for (const dept of departmentOrder) {
                if (reportsByDepartment[dept]) {
                    const report = reportsByDepartment[dept];
                    // Add page break class to all sections except the first one
                    const pageBreakClass = dept === 'teploelektracentral' ? '' : 'before-page-break';
                    fullReportHTML += `
                        <div class="full-report-section ${pageBreakClass}">
                            <div class="report-header">
                                <div class="report-title">ОТЧЁТ О РАБОТЕ ${this.departments[dept].name} ЗА СУТКИ</div>
                            </div>
                            <div class="preview-content">
                                ${this.generateDepartmentPreviewContent(report, dept)}
                            </div>
                        </div>
                    `;
                }
            }

            fullReportHTML += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="generate-full-report-pdf" class="btn btn-primary">Сформировать отчет в PDF</button>
                </div>
            `;

            container.innerHTML = fullReportHTML;

            // Add event listener for PDF generation
            document.getElementById('generate-full-report-pdf')?.addEventListener('click', async () => {
                await this.exportFullReportToPDF(reportsByDepartment);
            });

        } catch (error) {
            console.error('Ошибка генерации полного отчета:', error);
            container.innerHTML = '<p>Ошибка генерации полного отчета. Попробуйте еще раз.</p>';
        }
    }

    // Generate department report section
    generateDepartmentReportSection(report, department) {
        try {
            const data = report.data;

            // Format dates for display
            const reportDate = data.reportDate || '___  ___  _____';
            const periodStart = data.periodStart || '___  ___  _____';
            const periodEnd = data.periodEnd || '___  ___  _____';

            // Generate content based on department type using the same structure as preview
            switch (department) {
                case 'teploelektracentral':
                    return this.generateTeploelektracentralPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'stokovye_vody':
                    return this.generateStokovyeVodyPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'parosilovoe_hozyaystvo':
                    return this.generateParosilovoeHozyaystvoPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'elektroremontnyi_ceh':
                    return this.generateElektroremontnyiCehPreviewContent(data, reportDate, periodStart, periodEnd);
                default:
                    return '<p>Неизвестный тип отчета</p>';
            }
        } catch (error) {
            console.error('Ошибка генерации секции отчета отдела:', error);
            return '<p>Ошибка при формировании данных отдела</p>';
        }
    }

    // Generate Теплоэлектроцентраль section
    generateTeploelektracentralSection(data) {
        return `
            < div class="full-report-field" >
                <span class="field-label">Начальник смены ТЭЦ:</span>
                <span class="field-value">${data.shiftSupervisor || '_________________'}</span>
            </div >
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (Ракт 1):</span>
                <span class="field-value">${data.reactor1 || '__________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (Ракт 2):</span>
                <span class="field-value">${data.reactor2 || '__________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (сумма):</span>
                <span class="field-value">${data.reactorSum || '_________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Показания газового счетчика:</span>
                <span class="field-value">${data.gasMeter || '__________'} м3</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Потребление газа за сутки:</span>
                <span class="field-value">${data.gasConsumption || '__________'} м3</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (КГУ):</span>
                <span class="field-value">${data.kgu || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №1, котел №1):</span>
                <span class="field-value">${data.boiler1 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №1, котел №2):</span>
                <span class="field-value">${data.boiler2 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №3):</span>
                <span class="field-value">${data.boiler3 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Потребление пара (БДМ-1):</span>
                <span class="field-value">${data.steamConsumption || '__________'} т.</span>
            </div>
        `;
    }

    // Generate Участок сточных вод section
    generateStokovyeVodySection(data) {
        return `
            < div class="full-report-field" >
                <span class="field-label">Объём взвешенных веществ (утро):</span>
                <span class="field-value">${data.morningSuspended || '_____'} мг/л</span>
            </div >
            <div class="full-report-field">
                <span class="field-label">Объём взвешенных веществ (день):</span>
                <span class="field-value">${data.daySuspended || '_____'} мг/л</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём взвешенных веществ (вечер):</span>
                <span class="field-value">${data.eveningSuspended || '_____'} мг/л</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём обезвоженных осадков (08:00 - 20:00):</span>
                <span class="field-value">${data.sedimentDay || '_____'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём обезвоженных осадков (20:00 - 08:00):</span>
                <span class="field-value">${data.sedimentNight || '_____'} т.</span>
            </div>
        `;
    }

    // Generate Паросиловое хозяйство section
    generateParosilovoeHozyaystvoSection(data) {
        // This department doesn't have specific fields in the current implementation
        return '<div class="full-report-field"><span class="field-label">Нет специфических данных</span></div>';
    }

    // Generate Электроремонтный цех section
    generateElektroremontnyiCehSection(data) {
        // This department doesn't have specific fields in the current implementation
        return '<div class="full-report-field"><span class="field-label">Нет специфических данных</span></div>';
    }

    // Export full report to PDF
    async exportFullReportToPDF(reportsByDepartment) {
        try {
            // Create a temporary element for the full report
            const reportElement = document.querySelector('.combined-report-preview');
            if (!reportElement) {
                throw new Error('Элемент отчета не найден');
            }

            // Clone the element to avoid modifying the original
            const clonedElement = reportElement.cloneNode(true);

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const filename = "Полный_отчет_" + year + "-" + month + "-" + date + "_" + hours + "-" + minutes + "-" + seconds + ".pdf";

            const opt = {
                margin: [10, 5, 10, 5],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.before-page-break',
                    after: '.after-page-break',
                    avoid: '.avoid-page-break'
                }
            };

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportPDFWithFileSystemAPI(clonedElement, opt, filename);
            } else {
                // Fallback to traditional method
                await html2pdf().set(opt).from(clonedElement).save();
            }

            console.log('Полный отчет экспортирован успешно');
            this.showMessage('Полный отчет успешно экспортирован в PDF!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта полного отчета в PDF:', error);
            this.showMessage('Ошибка экспорта полного отчета в PDF. Попробуйте еще раз.', 'error');
        }
    }



    // Save report using File System Access API
    async saveReportWithFileSystemAPI(filename, jsonContent, year, month) {
        try {
            // Create suggested file name with folder structure simulation
            const suggestedName = `Отчеты / ${year} -${month}/${filename}`;

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'JSON файлы отчетов',
                    accept: {
                        'application/json': ['.json']
                    }
                }]
            });

            // Create a FileSystemWritableFileStream to write to
            const writable = await fileHandle.createWritable();

            // Write the contents of the file to the stream
            await writable.write(jsonContent);

            // Close the file and write the contents to disk
            await writable.close();
        } catch (error) {
            // If user cancelled the save dialog, re-throw the error
            if (error.name === 'AbortError') {
                throw error;
            }

            // For other errors, fall back to traditional download method
            console.warn('File System Access API недоступен, используем традиционный метод загрузки:', error);
            await this.saveReportWithDownload(filename, jsonContent);
        }
    }

    // Save report using traditional download method (fallback)
    async saveReportWithDownload(filename, jsonContent) {
        // Create blob and download
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Clear localStorage after saving report
    async clearLocalStorageAfterSave() {
        try {
            if (this.currentDraftId) {
                await window.storageAdapter.removeItem(this.currentDraftId);
                this.currentDraftId = null;
            }

            // Remove all draft entries with the same postfix as the saved report
            if (this.selectedForm) {
                // Define postfixes for different form types
                const formPostfixes = {
                    'teploelektracentral': '_tec',
                    'stokovye_vody': '_zsv',
                    'parosilovoe_hozyaystvo': '_pcx',
                    'elektroremontnyi_ceh': '_erc'
                };

                // Get the postfix for the current form type
                const postfix = formPostfixes[this.selectedForm] || '';

                // Get all items from storage adapter
                const allItems = await window.storageAdapter.getAllItems();

                // Filter and remove items with matching postfix
                for (const item of allItems) {
                    if (item.id && item.id.startsWith('draft' + postfix + '-')) {
                        await window.storageAdapter.removeItem(item.id);
                    }
                }
            }

            this.formData = {};
            this.isDirty = false;
            console.log('LocalStorage очищен после сохранения отчета');
        } catch (error) {
            console.error('Ошибка очистки localStorage:', error);
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
                        formType: this.selectedForm,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        submittedAt: new Date().toISOString(),
                        form: this.formData
                    };

                    await window.storageAdapter.setItem(finalData.id, finalData);
                    this.isDirty = false;

                    this.showMessage('Рапорт успешно отправлен!', 'success');

                    // Очищаем форму и возвращаемся к началу
                    setTimeout(() => {
                        this.selectedForm = null;
                        this.authenticated = false;
                        this.startNewForm();
                        this.showScreen('main-screen');
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
        console.log(`Current formOpenedFrom value:`, this.formOpenedFrom);
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

            // Reset formOpenedFrom when navigating away from form screen to other screens
            if (screenId !== 'form-screen') {
                console.log(`Resetting formOpenedFrom to null because navigating to: ${screenId}`);
                this.formOpenedFrom = null;
            } else {
                console.log(`Not resetting formOpenedFrom because navigating to form screen`);
            }

            // Attach event listener for download button when full report screen is shown
            if (screenId === 'full-report-folder-screen') {
                // Ensure the download button event listener is attached
                const downloadButton = document.getElementById('download-test-reports-btn');
                if (downloadButton && !downloadButton.hasAttribute('data-listener-attached')) {
                    downloadButton.addEventListener('click', () => {
                        this.downloadAllTestReports();
                    });
                    downloadButton.setAttribute('data-listener-attached', 'true');
                    console.log('Download button event listener attached');
                }
            }
        } else {
            console.error(`Экран с ID ${screenId} не найден!`);
        }
    }

    showFormScreen() {
        console.log('Показываем экран формы...');
        console.log('Current formOpenedFrom before showScreen:', this.formOpenedFrom);
        this.showScreen('form-screen');
        console.log('Current formOpenedFrom after showScreen:', this.formOpenedFrom);

        // Проверяем основную форму
        const mainForm = document.getElementById('main-form');
        if (mainForm) {
            console.log('Основная форма найдена');
            const formStyle = window.getComputedStyle(mainForm);
            console.log('Стили основной формы:');
            console.log('  display:', formStyle.display);
            console.log('  visibility:', formStyle.visibility);
            console.log('  opacity:', formStyle.opacity);
            console.log('  width:', formStyle.width);
            console.log('  height:', formStyle.height);

            // Принудительно делаем форму видимой
            mainForm.style.display = 'block';
            mainForm.style.visibility = 'visible';
            mainForm.style.opacity = '1';
            mainForm.style.width = '100%';
            mainForm.style.position = 'relative';
            console.log('Основная форма принудительно сделана видимой');
        } else {
            console.error('Основная форма не найдена!');
        }

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

    // New method for handling retrospective functionality
    async showRetrospective() {
        console.log('Открытие ретроспективы...');
        // Show the retrospective screen
        this.showScreen('retrospective-screen');
        // Load and display saved reports
        await this.loadSavedReports();
    }

    // Load and display saved reports
    async loadSavedReports() {
        try {
            const reportsList = document.getElementById('reports-list');

            // Try to use File System Access API first (for local server environment)
            if ('showDirectoryPicker' in window) {
                reportsList.innerHTML =
                    '<div class="browse-reports-section">' +
                    '<p>Выберите папку с отчетами для просмотра сохраненных отчетов:</p>' +
                    '<button id="browse-reports-btn" class="btn btn-primary">Выбрать папку с отчетами</button>' +
                    '<div id="reports-display"></div>' +
                    '</div>';

                // Add event listener for browse button
                document.getElementById('browse-reports-btn')?.addEventListener('click', async () => {
                    await this.browseReportsDirectory();
                });
            } else {
                // Fallback to file input method
                reportsList.innerHTML =
                    '<div class="file-upload-section">' +
                    '<p>Выберите файл отчета в формате JSON для редактирования:</p>' +
                    '<input type="file" id="report-file-input" accept=".json" class="file-input">' +
                    '<button id="load-report-btn" class="btn btn-primary">Загрузить отчет</button>' +
                    '</div>' +
                    '<div id="reports-display"></div>';

                // Add event listeners for file input and load button
                document.getElementById('load-report-btn')?.addEventListener('click', () => {
                    this.loadSelectedReport();
                });

                document.getElementById('report-file-input')?.addEventListener('change', (event) => {
                    this.handleReportFileSelection(event);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
            const reportsList = document.getElementById('reports-list');
            reportsList.innerHTML = '<p>Ошибка загрузки отчетов. Попробуйте еще раз.</p>';
        }
    }

    // Browse reports directory using File System Access API
    async browseReportsDirectory() {
        try {
            // Show directory picker
            const dirHandle = await window.showDirectoryPicker({
                mode: 'read'
            });

            // Display reports from the selected directory
            await this.displayReportsFromDirectory(dirHandle);
        } catch (error) {
            // If user cancelled the dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            console.error('Ошибка выбора папки:', error);
            this.showMessage('Ошибка выбора папки. Попробуйте еще раз.', 'error');
        }
    }

    // Display reports from a directory
    async displayReportsFromDirectory(dirHandle) {
        try {
            const reportsDisplay = document.getElementById('reports-display');
            reportsDisplay.innerHTML = '<p>Поиск отчетов...</p>';

            const reports = [];

            // Recursively search for JSON files in the directory
            await this.searchReportsInDirectory(dirHandle, reports);

            if (reports.length === 0) {
                reportsDisplay.innerHTML = '<p>В выбранной папке не найдено отчетов.</p>';
                return;
            }

            // Sort reports by date (newest first)
            reports.sort((a, b) => {
                try {
                    return new Date(b.metadata.last_modified || b.metadata.date_created) -
                        new Date(a.metadata.last_modified || a.metadata.date_created);
                } catch (error) {
                    return 0;
                }
            });

            // Display reports
            this.renderReportsList(reports, reportsDisplay);
        } catch (error) {
            console.error('Ошибка отображения отчетов:', error);
            const reportsDisplay = document.getElementById('reports-display');
            reportsDisplay.innerHTML = '<p>Ошибка загрузки отчетов. Попробуйте еще раз.</p>';
        }
    }

    // Recursively search for reports in a directory
    async searchReportsInDirectory(dirHandle, reports) {
        try {
            // Simple for-await loop
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    try {
                        // Get file and read content
                        const file = await entry.getFile();
                        const content = await file.text();

                        // Parse and validate JSON
                        const reportData = JSON.parse(content);

                        // Check if it's a valid report
                        if (reportData.metadata && reportData.data &&
                            reportData.metadata.report_id && reportData.metadata.date_created) {
                            reports.push({
                                name: entry.name,
                                handle: entry,
                                metadata: reportData.metadata,
                                data: reportData.data
                            });
                        }
                    } catch (error) {
                        // Skip invalid files
                        continue;
                    }
                } else if (entry.kind === 'directory') {
                    // Recursively search subdirectories
                    await this.searchReportsInDirectory(entry, reports);
                }
            }
        } catch (error) {
            console.error('Ошибка поиска отчетов в каталоге:', error);
            throw error;
        }
    }

    // Function to clear department-specific localStorage entries
    clearDepartmentDraftsFromLocalStorage() {
        try {
            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Get the postfix for the current form type
            const currentPostfix = formPostfixes[this.selectedForm] || '';

            if (currentPostfix) {
                // Get all keys from localStorage
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    // Check if the key contains the current department's postfix
                    if (key && key.includes(currentPostfix)) {
                        localStorage.removeItem(key);
                        console.log(`Удалена запись localStorage: ${key}`);
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка очистки localStorage:', error);
        }
    }

    // Render reports list in the UI
    renderReportsList(reports, container) {
        // Filter reports based on the user's department
        const formPostfixes = {
            'teploelektracentral': '_tec',
            'stokovye_vody': '_zsv',
            'parosilovoe_hozyaystvo': '_pcx',
            'elektroremontnyi_ceh': '_erc'
        };

        // Get the postfix for the current user's department
        const currentUserPostfix = formPostfixes[this.selectedForm] || '';

        // Filter reports that match the current user's department
        const filteredReports = reports.filter(report => {
            // If we have a postfix for the current department, filter by it
            if (currentUserPostfix) {
                return report.name.includes(currentUserPostfix + '.json');
            }
            // If no postfix (shouldn't happen), show all reports
            return true;
        });

        if (filteredReports.length === 0) {
            container.innerHTML = '<p>Отчеты не найдены.</p>';
            return;
        }

        let reportsHTML = '<div class="reports-grid">';

        filteredReports.forEach((report, index) => {
            // Format the date properly
            let formattedDate = 'Неизвестная дата';
            try {
                if (report.metadata && report.metadata.date_created) {
                    const createdDate = new Date(report.metadata.date_created);
                    formattedDate = createdDate.toLocaleString('ru-RU');
                }
            } catch (dateError) {
                console.warn('Ошибка форматирования даты:', dateError);
            }

            // Remove .json extension from filename for display
            let displayName = report.name;
            if (displayName.endsWith('.json')) {
                displayName = displayName.substring(0, displayName.length - 5);
            }

            reportsHTML += `
                <div class="report-item" data-index="${index}">
                    <div class="report-date">${formattedDate}</div>
                    <div class="report-filename">${displayName}</div>
                    <button class="btn btn-outline load-report-btn" data-index="${index}">Загрузить</button>
                </div>
            `;
        });

        reportsHTML += '</div>';
        container.innerHTML = reportsHTML;

        // Add event listeners for load buttons
        document.querySelectorAll('.load-report-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const index = parseInt(event.target.getAttribute('data-index'));
                this.loadReportFromList(filteredReports[index]);
            });
        });
    }

    // Load report from the reports list
    async loadReportFromList(report) {
        try {
            // Validate report data
            if (!report || !report.data) {
                throw new Error('Некорректные данные отчета');
            }

            // Set form data
            this.formData = report.data;

            // Mark that form was opened from retrospective
            console.log('Setting formOpenedFrom to retrospective in loadReportFromList');
            this.formOpenedFrom = 'retrospective';
            console.log('formOpenedFrom is now:', this.formOpenedFrom);

            // Populate form with data
            this.populateForm();

            // Show form screen
            this.showFormScreen();

            this.showMessage('Отчет успешно загружен для редактирования', 'success');
        } catch (error) {
            console.error('Ошибка загрузки отчета:', error);
            this.showMessage('Ошибка загрузки отчета. Попробуйте еще раз.', 'error');
        }
    }

    // Handle report file selection
    handleReportFileSelection(event) {
        const fileInput = event.target;
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            console.log('Выбран файл:', fileName);
            // Enable the load button
            const loadButton = document.getElementById('load-report-btn');
            if (loadButton) {
                loadButton.disabled = false;
            }
        }
    }

    // Load selected report file
    async loadSelectedReport() {
        // Try to use File System Access API first (for local server environment)
        if ('showOpenFilePicker' in window) {
            await this.loadReportWithFilePicker();
        } else {
            // Fallback to traditional file input method
            const fileInput = document.getElementById('report-file-input');
            if (!fileInput || fileInput.files.length === 0) {
                this.showMessage('Пожалуйста, выберите файл отчета', 'error');
                return;
            }

            const file = fileInput.files[0];
            if (!file.name.endsWith('.json')) {
                this.showMessage('Пожалуйста, выберите файл в формате JSON', 'error');
                return;
            }

            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const jsonData = e.target.result;
                        this.loadReportFromJSON(jsonData);
                    } catch (error) {
                        console.error('Ошибка чтения файла:', error);
                        this.showMessage('Ошибка чтения файла. Проверьте файл и попробуйте еще раз.', 'error');
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Ошибка загрузки файла:', error);
                this.showMessage('Ошибка загрузки файла. Попробуйте еще раз.', 'error');
            }
        }
    }

    // Load report using File System Access API file picker
    async loadReportWithFilePicker() {
        try {
            // Show open file picker
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON файлы отчетов',
                    accept: {
                        'application/json': ['.json']
                    }
                }],
                multiple: false
            });

            // Get file
            const file = await fileHandle.getFile();

            // Read file content
            const content = await file.text();

            // Load report from JSON
            await this.loadReportFromJSON(content);
        } catch (error) {
            // If user cancelled the dialog, do nothing
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Ошибка выбора файла:', error);
            this.showMessage('Ошибка выбора файла. Попробуйте еще раз.', 'error');
        }
    }

    // Load report data from JSON and populate form
    async loadReportFromJSON(jsonData) {
        try {
            const reportData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Validate report structure inline
            if (!reportData ||
                !reportData.metadata ||
                !reportData.data ||
                !reportData.metadata.report_id ||
                !reportData.metadata.date_created) {
                throw new Error('Некорректная структура файла отчета');
            }

            // Set form data
            this.formData = reportData.data;

            // Mark that form was opened from retrospective
            console.log('Setting formOpenedFrom to retrospective in loadReportFromJSON');
            this.formOpenedFrom = 'retrospective';
            console.log('formOpenedFrom is now:', this.formOpenedFrom);

            // Populate form with data
            this.populateForm();

            // Show form screen
            this.showFormScreen();

            this.showMessage('Отчет успешно загружен для редактирования', 'success');
        } catch (error) {
            console.error('Ошибка загрузки отчета:', error);
            this.showMessage('Ошибка загрузки отчета. Проверьте файл и попробуйте еще раз.', 'error');
        }
    }

    // Handle selection of full report
    selectForm(formType) {
        if (formType === 'full-report') {
            // Show authentication screen for full report
            this.showScreen('full-report-auth-screen');
            return;
        }

        this.selectedForm = formType;
        this.showScreen('auth-screen');
        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = `Аутентификация - ${this.departments[formType].name}`;
        }

        // Update form title in the form
        const formReportTitle = document.getElementById('form-report-title');
        if (formReportTitle) {
            formReportTitle.textContent = `ОТЧЁТ О РАБОТЕ ${this.departments[formType].name} ЗА СУТКИ`;
        }

        // Show/hide form sections based on form type
        this.updateFormSections(formType);
    }

    // Authenticate for full report (admin only)
    authenticateFullReport() {
        const username = document.getElementById('full-report-username').value;
        const password = document.getElementById('full-report-password').value;
        const errorElements = document.querySelectorAll('#full-report-authentication-form .error-message');
        errorElements.forEach(el => el.classList.remove('show'));

        if (!username || !password) {
            // Find the error element for the first empty field
            if (!username) {
                this.showFieldError(document.getElementById('full-report-username'), 'Заполните все поля');
            }
            if (!password) {
                this.showFieldError(document.getElementById('full-report-password'), 'Заполните все поля');
            }
            return;
        }

        // Check if user is admin
        let isAdmin = false;
        for (const dept in this.departments) {
            if (this.departments[dept].users['admin'] && this.departments[dept].users['admin'] === password && username === 'admin') {
                isAdmin = true;
                break;
            }
        }

        if (isAdmin) {
            this.isAdminAuthenticated = true;
            // Show folder selection screen
            this.showScreen('full-report-folder-screen');
        } else {
            this.showFieldError(document.getElementById('full-report-username'), 'Неверный логин или пароль');
        }
    }

    // Browse folder for full report
    async browseFullReportFolder() {
        try {
            // Show directory picker
            const dirHandle = await window.showDirectoryPicker({
                mode: 'read'
            });

            // Display reports from the selected directory
            await this.displayFullReportFromDirectory(dirHandle);
        } catch (error) {
            // If user cancelled the dialog or there's a state error, do nothing
            if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
                console.log('Операция отменена пользователем или недоступна: ', error.message);
                return;
            }

            console.error('Ошибка выбора папки:', error);
            this.showMessage('Ошибка выбора папки. Попробуйте еще раз.', 'error');
        }
    }

    // Download all test reports as a zip file
    // Обновление от 25.10.2025: Исправлена проблема с CORS при запуске через file:// протокол
    // Вместо fetch() файлы теперь встраиваются напрямую для избежания проблем с доступом к файлам
    async downloadAllTestReports() {
        try {
            // Define test reports content directly to avoid CORS issues
            const testReports = [
                {
                    name: 'test_report_tec.json',
                    content: JSON.stringify({
                        "metadata": {
                            "date_created": "2023-10-15T10:30:00.000Z",
                            "last_modified": "2023-10-15T10:30:00.000Z",
                            "report_id": "test-report-tec-123",
                            "version": 1
                        },
                        "data": {
                            "reportDate": "15.10.2023",
                            "periodStart": "15.10.2023",
                            "periodEnd": "15.10.2023",
                            "startTime": "08-00",
                            "endTime": "08-00",
                            "shiftSupervisor": "Петров П.П.",
                            "emergencySituations": [
                                {
                                    "time": "15.10.2023 10:00",
                                    "equipment": "Турбина №1",
                                    "description": "Неисправность турбины\\nТребуется капитальный ремонт",
                                    "actions": "Отключение турбины\\nВызов специалистов",
                                    "recovery": "15.10.2023 12:00"
                                },
                                {
                                    "time": "15.10.2023 14:30",
                                    "equipment": "Котел №3",
                                    "description": "Проблемы с подачей угля",
                                    "actions": "Переключение на резервный котел",
                                    "recovery": "15.10.2023 16:00"
                                }
                            ],
                            "equipmentDeviations": "Незначительные отклонения в работе оборудования"
                        }
                    }, null, 2)
                },
                {
                    name: 'test_report_zsv.json',
                    content: JSON.stringify({
                        "metadata": {
                            "date_created": "2023-10-15T10:30:00.000Z",
                            "last_modified": "2023-10-15T10:30:00.000Z",
                            "report_id": "test-report-zsv-123",
                            "version": 1
                        },
                        "data": {
                            "reportDate": "15.10.2023",
                            "periodStart": "15.10.2023",
                            "periodEnd": "15.10.2023",
                            "startTime": "08-00",
                            "endTime": "08-00",
                            "shiftSupervisor": "Сидоров С.С.",
                            "emergencySituations": [
                                {
                                    "time": "15.10.2023 09:15",
                                    "equipment": "Фильтр №1",
                                    "description": "Засорение фильтра\\nСнижение эффективности очистки",
                                    "actions": "Остановка фильтра\\nПромывка системы",
                                    "recovery": "15.10.2023 11:30"
                                },
                                {
                                    "time": "15.10.2023 15:45",
                                    "equipment": "Насос реагентов",
                                    "description": "Неисправность дозировочного насоса",
                                    "actions": "Переключение на резервный насос\\nВызов ремонтной бригады",
                                    "recovery": "15.10.2023 17:20"
                                }
                            ],
                            "equipmentDeviations": "Отклонения в параметрах очистки воды"
                        }
                    }, null, 2)
                },
                {
                    name: 'test_report_pcx.json',
                    content: JSON.stringify({
                        "metadata": {
                            "date_created": "2023-10-15T10:30:00.000Z",
                            "last_modified": "2023-10-15T10:30:00.000Z",
                            "report_id": "test-report-pcx-123",
                            "version": 1
                        },
                        "data": {
                            "reportDate": "15.10.2023",
                            "periodStart": "15.10.2023",
                            "periodEnd": "15.10.2023",
                            "startTime": "08-00",
                            "endTime": "08-00",
                            "shiftSupervisor": "Кузнецов К.К.",
                            "emergencySituations": [
                                {
                                    "time": "15.10.2023 11:20",
                                    "equipment": "Паровой котел №2",
                                    "description": "Снижение давления пара\\nУтечка в системе",
                                    "actions": "Снижение нагрузки\\nПоиск места утечки",
                                    "recovery": "15.10.2023 13:45"
                                },
                                {
                                    "time": "15.10.2023 16:30",
                                    "equipment": "Деаэратор",
                                    "description": "Неисправность системы деаэрации",
                                    "actions": "Перевод на обводную линию\\nРемонт оборудования",
                                    "recovery": "15.10.2023 18:15"
                                }
                            ],
                            "equipmentDeviations": "Небольшие колебания параметров пара"
                        }
                    }, null, 2)
                },
                {
                    name: 'test_report_erc.json',
                    content: JSON.stringify({
                        "metadata": {
                            "date_created": "2023-10-15T10:30:00.000Z",
                            "last_modified": "2023-10-15T10:30:00.000Z",
                            "report_id": "test-report-erc-123",
                            "version": 1
                        },
                        "data": {
                            "reportDate": "15.10.2023",
                            "periodStart": "15.10.2023",
                            "periodEnd": "15.10.2023",
                            "startTime": "08-00",
                            "endTime": "08-00",
                            "shiftSupervisor": "Васильев В.В.",
                            "emergencySituations": [
                                {
                                    "time": "15.10.2023 09:45",
                                    "equipment": "Трансформатор ТМ-1",
                                    "description": "Перегрев трансформатора\\nАномальные шумы",
                                    "actions": "Отключение трансформатора\\nЗамеры температуры",
                                    "recovery": "15.10.2023 12:30"
                                },
                                {
                                    "time": "15.10.2023 14:20",
                                    "equipment": "Выключатель ВН-35",
                                    "description": "Неисправность привода выключателя",
                                    "actions": "Блокировка выключателя\\nВызов специалистов",
                                    "recovery": "15.10.2023 16:50"
                                }
                            ],
                            "equipmentDeviations": "Отклонения в параметрах электрооборудования"
                        }
                    }, null, 2)
                }
            ];

            // Create a zip file containing all reports
            const zip = new JSZip();
            let filesAdded = 0;

            // Add each report to the zip
            for (const report of testReports) {
                try {
                    console.log(`Adding file to zip: ${report.name}`);
                    zip.file(report.name, report.content);
                    filesAdded++;
                } catch (error) {
                    console.error(`Error adding ${report.name} to zip:`, error);
                    this.showMessage(`Ошибка добавления ${report.name} в архив: ${error.message}`, 'error');
                }
            }

            console.log(`Total files added to zip: ${filesAdded}`);

            if (filesAdded === 0) {
                this.showMessage('Не удалось добавить ни один тестовый отчет в архив', 'error');
                return;
            }

            // Generate and download the zip file
            const zipContent = await zip.generateAsync({ type: 'blob' });
            console.log(`Generated zip file size: ${zipContent.size} bytes`);

            const zipUrl = URL.createObjectURL(zipContent);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = 'test_reports.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);

            this.showMessage(`Тестовые отчеты успешно скачаны! (${filesAdded} файлов)`, 'success');
        } catch (error) {
            console.error('Ошибка при скачивании тестовых отчетов:', error);
            this.showMessage('Ошибка при скачивании тестовых отчетов: ' + error.message, 'error');
        }
    }

    // Display reports from a directory for full report
    async displayFullReportFromDirectory(dirHandle) {
        try {
            const reportsDisplay = document.getElementById('full-report-display');
            reportsDisplay.innerHTML = '<p>Поиск отчетов...</p>';

            const reports = [];

            // Recursively search for JSON files in the directory
            await this.searchReportsInDirectory(dirHandle, reports);

            if (reports.length === 0) {
                reportsDisplay.innerHTML = '<p>В выбранной папке не найдено отчетов.</p>';
                return;
            }

            // Generate full report
            await this.generateFullReport(reports, reportsDisplay);
        } catch (error) {
            console.error('Ошибка формирования полного отчета:', error);
            const reportsDisplay = document.getElementById('full-report-display');
            reportsDisplay.innerHTML = '<p>Ошибка формирования полного отчета. Попробуйте еще раз.</p>';
        }
    }

    // Generate full report from individual reports
    async generateFullReport(reports, container) {
        try {
            // Define postfixes for different form types
            const formPostfixes = {
                'teploelektracentral': '_tec',
                'stokovye_vody': '_zsv',
                'parosilovoe_hozyaystvo': '_pcx',
                'elektroremontnyi_ceh': '_erc'
            };

            // Group reports by department
            const reportsByDepartment = {};

            // Sort reports by date (newest first)
            reports.sort((a, b) => {
                try {
                    return new Date(b.metadata.last_modified || b.metadata.date_created) -
                        new Date(a.metadata.last_modified || a.metadata.date_created);
                } catch (error) {
                    return 0;
                }
            });

            // Process each report and group by department
            for (const report of reports) {
                // Determine which department this report belongs to based on postfix
                for (const [dept, postfix] of Object.entries(formPostfixes)) {
                    if (report.name.includes(postfix + '.json')) {
                        if (!reportsByDepartment[dept]) {
                            reportsByDepartment[dept] = report; // Keep only the latest report for each department
                        }
                        break;
                    }
                }
            }

            // Generate combined report HTML
            let fullReportHTML = `
                <div class="combined-report-preview">
                    <div class="combined-report-header">
                        <h1 class="combined-report-title">ПОЛНЫЙ ОТЧЁТ О РАБОТЕ ПОДРАЗДЕЛЕНИЙ ЗА СУТКИ</h1>
                        <div class="combined-report-date">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
                    </div>
            `;

            // Define the required order of departments
            const departmentOrder = [
                'teploelektracentral',
                'stokovye_vody',
                'parosilovoe_hozyaystvo',
                'elektroremontnyi_ceh'
            ];

            // Add each department's report section in the required order
            for (const dept of departmentOrder) {
                const report = reportsByDepartment[dept];
                if (report) {
                    fullReportHTML += `
                        <div class="full-report-section">
                            <h3>ОТЧЁТ О РАБОТЕ ${this.departments[dept].name} ЗА СУТКИ</h3>
                            ${this.generateDepartmentReportSection(report, dept)}
                        </div>
                    `;
                }
            }

            fullReportHTML += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="generate-full-report-pdf" class="btn btn-primary">Сформировать отчет в PDF</button>
                </div>
            `;

            container.innerHTML = fullReportHTML;

            // Add event listener for PDF generation
            document.getElementById('generate-full-report-pdf')?.addEventListener('click', async () => {
                await this.exportFullReportToPDF(reportsByDepartment);
            });

        } catch (error) {
            console.error('Ошибка генерации полного отчета:', error);
            container.innerHTML = '<p>Ошибка генерации полного отчета. Попробуйте еще раз.</p>';
        }
    }

    // Generate department report section
    generateDepartmentReportSection(report, department) {
        try {
            const data = report.data;

            // Format dates for display
            const reportDate = data.reportDate || '___  ___  _____';
            const periodStart = data.periodStart || '___  ___  _____';
            const periodEnd = data.periodEnd || '___  ___  _____';

            // Generate content based on department type using the same structure as preview
            switch (department) {
                case 'teploelektracentral':
                    return this.generateTeploelektracentralPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'stokovye_vody':
                    return this.generateStokovyeVodyPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'parosilovoe_hozyaystvo':
                    return this.generateParosilovoeHozyaystvoPreviewContent(data, reportDate, periodStart, periodEnd);
                case 'elektroremontnyi_ceh':
                    return this.generateElektroremontnyiCehPreviewContent(data, reportDate, periodStart, periodEnd);
                default:
                    return '<p>Неизвестный тип отчета</p>';
            }
        } catch (error) {
            console.error('Ошибка генерации секции отчета отдела:', error);
            return '<p>Ошибка при формировании данных отдела</p>';
        }
    }

    // Generate Теплоэлектроцентраль section
    generateTeploelektracentralSection(data) {
        return `
            <div class="full-report-field">
                <span class="field-label">Начальник смены ТЭЦ:</span>
                <span class="field-value">${data.shiftSupervisor || '_________________'}</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (Ракт 1):</span>
                <span class="field-value">${data.reactor1 || '__________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (Ракт 2):</span>
                <span class="field-value">${data.reactor2 || '__________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Выработка электроэнергии (сумма):</span>
                <span class="field-value">${data.reactorSum || '_________'} МВт·ч</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Показания газового счетчика:</span>
                <span class="field-value">${data.gasMeter || '__________'} м3</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Потребление газа за сутки:</span>
                <span class="field-value">${data.gasConsumption || '__________'} м3</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (КГУ):</span>
                <span class="field-value">${data.kgu || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №1, котел №1):</span>
                <span class="field-value">${data.boiler1 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №1, котел №2):</span>
                <span class="field-value">${data.boiler2 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Производство пара (Котельная №3):</span>
                <span class="field-value">${data.boiler3 || '__________'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Потребление пара (БДМ-1):</span>
                <span class="field-value">${data.steamConsumption || '__________'} т.</span>
            </div>
        `;
    }

    // Generate Участок сточных вод section
    generateStokovyeVodySection(data) {
        return `
            <div class="full-report-field">
                <span class="field-label">Объём взвешенных веществ (утро):</span>
                <span class="field-value">${data.morningSuspended || '_____'} мг/л</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём взвешенных веществ (день):</span>
                <span class="field-value">${data.daySuspended || '_____'} мг/л</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём взвешенных веществ (вечер):</span>
                <span class="field-value">${data.eveningSuspended || '_____'} мг/л</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём обезвоженных осадков (08:00 - 20:00):</span>
                <span class="field-value">${data.sedimentDay || '_____'} т.</span>
            </div>
            <div class="full-report-field">
                <span class="field-label">Объём обезвоженных осадков (20:00 - 08:00):</span>
                <span class="field-value">${data.sedimentNight || '_____'} т.</span>
            </div>
        `;
    }

    // Generate Паросиловое хозяйство section
    generateParosilovoeHozyaystvoSection(data) {
        // This department doesn't have specific fields in the current implementation
        return '<div class="full-report-field"><span class="field-label">Нет специфических данных</span></div>';
    }

    // Generate Электроремонтный цех section
    generateElektroremontnyiCehSection(data) {
        // This department doesn't have specific fields in the current implementation
        return '<div class="full-report-field"><span class="field-label">Нет специфических данных</span></div>';
    }

    // Export full report to PDF
    async exportFullReportToPDF(reportsByDepartment) {
        try {
            // Create a temporary element for the full report
            const reportElement = document.querySelector('.combined-report-preview');
            if (!reportElement) {
                throw new Error('Элемент отчета не найден');
            }

            // Clone the element to avoid modifying the original
            const clonedElement = reportElement.cloneNode(true);

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const filename = `Полный_отчет_${year}-${month}-${date}_${hours}-${minutes}-${seconds}.pdf`;

            const opt = {
                margin: [10, 5, 10, 5],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.before-page-break',
                    after: '.after-page-break',
                    avoid: '.avoid-page-break'
                }
            };

            // Try to use File System Access API first (for local server environment)
            if ('showSaveFilePicker' in window) {
                await this.exportPDFWithFileSystemAPI(clonedElement, opt, filename);
            } else {
                // Fallback to traditional method
                await html2pdf().set(opt).from(clonedElement).save();
            }

            console.log('Полный отчет экспортирован успешно');
            this.showMessage('Полный отчет успешно экспортирован в PDF!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта полного отчета в PDF:', error);
            this.showMessage('Ошибка экспорта полного отчета в PDF. Попробуйте еще раз.', 'error');
        }
    }

}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем приложение...');

    // Создаем приложение
    window.reportApp = new ReportFormApp();
    // Initialize the app
    window.reportApp.init();

    // Check for URL hash and show appropriate screen
    if (window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove the #
        const screenId = hash.replace('#', ''); // Remove any extra # characters
        console.log('Навигация по хешу к экрану:', screenId);

        // Small delay to ensure DOM is fully loaded
        setTimeout(() => {
            if (window.reportApp && typeof window.reportApp.showScreen === 'function') {
                window.reportApp.showScreen(screenId);
            } else {
                console.error('Не удалось получить доступ к функции showScreen');
            }
        }, 100);
    }

    // Fallback для кнопки, если что-то пошло не так
    setTimeout(() => {
        const noDraftElement = document.getElementById('no-draft');
        if (noDraftElement && noDraftElement.style.display === 'none') {
            console.log('Принудительно показываем кнопку начала формы');
            noDraftElement.style.display = 'block';
        }
    }, 2000);
});