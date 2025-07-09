export interface Translations {
    common: {
        loading: string;
        error: string;
        success: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        create: string;
        update: string;
        search: string;
        filter: string;
        clear: string;
        refresh: string;
        send: string;
        yes: string;
        no: string;
        back: string;
        next: string;
        previous: string;
        close: string;
        open: string;
        view: string;
        download: string;
        upload: string;
        retry: string;
        confirm: string;
        status: string;
        name: string;
        email: string;
        phone: string;
        address: string;
        date: string;
        time: string;
        type: string;
        priority: string;
        description: string;
        notes: string;
        actions: string;
        details: string;
        total: string;
        active: string;
        inactive: string;
        all: string;
        none: string;
        required: string;
        optional: string;
        connecting: string;
        connected: string;
        disconnected: string;
    };

    app: {
        title: string;
        subtitle: string;
        signIn: string;
        signOut: string;
        signingIn: string;
        initializing: string;
        initializingSubtext: string;
        dbConnectionIssue: string;
        dbConnectionSteps: string;
        stepCreateEnv: string;
        stepAddUrl: string;
        stepAddKey: string;
        stepRestart: string;
        retryConnection: string;
        authRequired: string;
        contactAdmin: string;
    };

    navigation: {
        overview: string;
        cases: string;
        analytics: string;
        messages: string;
        users: string;
        ai: string;
        communication: string;
    };

    dashboard: {
        welcomeBack: string;
        systemAdmin: string;
        legalProfessional: string;
        totalCases: string;
        newRequests: string;
        urgentCases: string;
        unreadMessages: string;
        requiresAttention: string;
        unreadMessagesText: string;
        highPriority: string;
        activeCasesInSystem: string;
        recentCases: string;
        recentMessages: string;
        noRecentCases: string;
        noRecentMessages: string;
        quickActions: string;
        manageCases: string;
        manageCasesDesc: string;
        viewAnalytics: string;
        viewAnalyticsDesc: string;
        messagesDesc: string;
        telegramConversations: string;
        manageUsers: string;
        manageUsersDesc: string;
        userAdministration: string;
        performanceInsights: string;
    };

    cases: {
        title: string;
        subtitle: string;
        totalCases: string;
        client: string;
        caseType: string;
        status: string;
        priority: string;
        assignedLawyer: string;
        responseTime: string;
        created: string;
        searchCases: string;
        allStatuses: string;
        allPriorities: string;
        allLawyers: string;
        unassigned: string;
        clearFilters: string;
        noCasesFound: string;
        noMatchingCases: string;
        generalInquiry: string;
        assignCase: string;
        closeCase: string;
        rejectCase: string;
        deleteCase: string;

        // Case statuses
        statusNew: string;
        statusAssigned: string;
        statusInProgress: string;
        statusClosed: string;
        statusRejected: string;

        // Priorities
        priorityLow: string;
        priorityMedium: string;
        priorityHigh: string;
        priorityUrgent: string;

        // Modals
        assignCaseTitle: string;
        assignCaseText: string;
        closeCaseTitle: string;
        closeCaseText: string;
        closureReason: string;
        closureReasonPlaceholder: string;
        clientSatisfactionRating: string;
        satisfactionExcellent: string;
        satisfactionGood: string;
        satisfactionAverage: string;
        satisfactionPoor: string;
        satisfactionVeryPoor: string;
        rejectCaseTitle: string;
        rejectCaseText: string;
        rejectionReason: string;
        rejectionReasonPlaceholder: string;

        // Confirmation dialogs
        deleteConfirm: string;
        cannotUndo: string;
    };

    analytics: {
        title: string;
        subtitle: string;
        timeRange: string;
        office: string;
        last7Days: string;
        last30Days: string;
        last90Days: string;
        lastYear: string;
        allOffices: string;

        // Key metrics
        totalCases: string;
        closedCases: string;
        avgResponseTime: string;
        satisfactionRating: string;
        outOf5: string;
        completionRate: string;
        timeToFirstResponse: string;

        // Case status distribution
        caseStatusDistribution: string;
        newRequests: string;
        inProgress: string;
        closed: string;
        rejected: string;

        // Office performance
        officePerformance: string;
        avgResponse: string;
        rating: string;

        // Lawyer performance
        lawyerPerformance: string;
        noPerformanceData: string;
        lawyer: string;
        totalCasesCol: string;
        closedCol: string;
        rejectedCol: string;
        activeCol: string;
        avgResponseCol: string;
        ratingCol: string;

        // Time formatting
        minutes: string;
        hours: string;
    };

    users: {
        title: string;
        subtitle: string;
        addUser: string;
        searchUsers: string;
        allRoles: string;
        allOffices: string;
        allStatuses: string;
        clearFilters: string;
        noUsersFound: string;
        noMatchingUsers: string;

        // Table headers
        user: string;
        role: string;
        office: string;
        status: string;
        created: string;
        lastLogin: string;
        actions: string;

        // Roles
        admin: string;
        lawyer: string;
        client: string;

        // Status
        active: string;
        inactive: string;
        never: string;
        noOffice: string;

        // Modals
        createNewUser: string;
        editUser: string;
        nameRequired: string;
        emailRequired: string;
        roleRequired: string;
        activeUser: string;
        createUser: string;
        updateUser: string;

        // Access restriction
        accessRestricted: string;
        adminOnly: string;
    };

    telegram: {
        title: string;
        botToken: string;
        botTokenRequired: string;
        botTokenDesc: string;
        connecting: string;
        connected: string;
        disconnected: string;
        polling: string;
        errors: string;
        refreshMessages: string;
        reconnect: string;

        // Chat interface
        systemMessages: string;
        noUserConversations: string;
        messagesWillAppear: string;
        unknownChat: string;
        secureStored: string;
        secureStoredSupabase: string;
        typeMessage: string;
        enterToSend: string;
        shiftEnterNewLine: string;
        edited: string;

        // Bot info
        botUsername: string;
        directLink: string;
        usersCanMessage: string;
        allMessagesStored: string;

        // Connection messages
        connectedToBot: string;
        botLink: string;
        usersCanMessageBot: string;
        messagesAutoSaved: string;
        connectionFailed: string;
        browserRestrictions: string;
        serverProxyNote: string;
        startedPolling: string;
        newMessageFrom: string;
        messageEdited: string;
        messageSent: string;
        messageFailed: string;
        networkIssues: string;
        pollingIssues: string;
        pollingStopped: string;
        manualRefresh: string;
        refreshCompleted: string;
        refreshFailed: string;

        // Delete conversation
        deleteConversation: string;
        deleteConfirm: string;
        deleteWarning: string;
        deleting: string;
        conversationDeleted: string;
        deleteFailed: string;
    };

    ai: {
        title: string;
        subtitle: string;
        ethicsCompliant: string;
        newCaseChat: string;

        // Features
        legalResearch: string;
        legalResearchDesc: string;
        documentAnalysis: string;
        documentAnalysisDesc: string;
        caseAssessment: string;
        caseAssessmentDesc: string;
        caseSpecificChat: string;
        caseSpecificChatDesc: string;

        // Usage stats
        queriesThisMonth: string;
        documentsAnalyzed: string;
        assessmentsCompleted: string;
        activeConversations: string;

        // Recent conversations
        recentConversations: string;
        viewAll: string;
        selectCaseChat: string;
        chooseConversation: string;
        startNew: string;

        // Ethics notice
        ethicsNoticeTitle: string;
        ethicsNotice: string;
    };

    communication: {
        title: string;
        telegramBot: string;
        telegramBotDesc: string;
        ready: string;
        openArrow: string;
        additionalChannels: string;
        comingSoon: string;
        communicationFeatures: string;

        // Telegram features
        realTimePolling: string;
        chronologicalSorting: string;
        duplicateHandling: string;
        editSupport: string;
        multipleChatManagement: string;
        networkRecovery: string;
        persistentStorage: string;
        encryptedDatabase: string;
        fullHistory: string;
        messageSearch: string;

        // Database features
        databaseFeatures: string;
        automaticBackup: string;
        conversationThreading: string;
        statusTracking: string;
        timestampPreservation: string;
        editHistory: string;
        secureEncryption: string;

        // Security notice
        securityPrivacy: string;
        securityNotice: string;
    };

    invitation: {
        // Basic invitation
        inviteUser: string;
        invitationEmail: string;
        roleForInvitedUser: string;
        sendInvitation: string;
        sendingInvitation: string;
        invitationSent: string;
        invitationError: string;
        invitationResent: string;

        // Invitation management
        pendingInvitations: string;
        pendingInvitationsDesc: string;
        sentBy: string;
        expiresAt: string;
        resendInvitation: string;
        deleteInvitation: string;
        deleteConfirm: string;

        // Registration process
        completeRegistration: string;
        invitedToJoin: string;
        invitationDetails: string;
        fullName: string;
        enterFullName: string;
        password: string;
        enterPassword: string;
        confirmPassword: string;
        confirmPasswordPlaceholder: string;
        createAccount: string;
        creatingAccount: string;
        registrationSuccess: string;
        redirecting: string;
        securityNotice: string;

        // Validation messages
        nameRequired: string;
        nameTooShort: string;
        passwordRequired: string;
        passwordTooShort: string;
        confirmPasswordRequired: string;
        passwordsDoNotMatch: string;

        // Error states
        verifying: string;
        verifyingSubtext: string;
        invalidOrExpired: string;
        loadError: string;
        registrationError: string;
        possibleReasons: string;
        reasonExpired: string;
        reasonAlreadyUsed: string;
        reasonInvalidLink: string;
    };

    formats: {
        date: string;
        time: string;
        datetime: string;
        currency: string;
        percentage: string;
    };
}

export type Language = 'ru' | 'en';

export const translations: Record<Language, Translations> = {
    ru: {
        common: {
            loading: 'Загрузка',
            error: 'Ошибка',
            success: 'Успешно',
            cancel: 'Отмена',
            save: 'Сохранить',
            delete: 'Удалить',
            edit: 'Редактировать',
            create: 'Создать',
            update: 'Обновить',
            search: 'Поиск',
            filter: 'Фильтр',
            clear: 'Очистить',
            refresh: 'Обновить',
            send: 'Отправить',
            yes: 'Да',
            no: 'Нет',
            back: 'Назад',
            next: 'Далее',
            previous: 'Предыдущий',
            close: 'Закрыть',
            open: 'Открыть',
            view: 'Просмотр',
            download: 'Скачать',
            upload: 'Загрузить',
            retry: 'Повторить',
            confirm: 'Подтвердить',
            status: 'Статус',
            name: 'Имя',
            email: 'Email',
            phone: 'Телефон',
            address: 'Адрес',
            date: 'Дата',
            time: 'Время',
            type: 'Тип',
            priority: 'Приоритет',
            description: 'Описание',
            notes: 'Примечания',
            actions: 'Действия',
            details: 'Детали',
            total: 'Всего',
            active: 'Активный',
            inactive: 'Неактивный',
            all: 'Все',
            none: 'Нет',
            required: 'Обязательно',
            optional: 'Необязательно',
            connecting: 'Подключение',
            connected: 'Подключено',
            disconnected: 'Отключено',
        },

        app: {
            title: 'LegalFlow - Телеграм Связь',
            subtitle: 'Безопасная система связи через Телеграм бота для юристов',
            signIn: 'Войти',
            signOut: 'Выйти',
            signingIn: 'Вход...',
            initializing: 'Инициализация LegalFlow',
            initializingSubtext: 'Настройка системы управления юридическими делами...',
            dbConnectionIssue: 'Проблема подключения к базе данных',
            dbConnectionSteps: 'Шаги настройки:',
            stepCreateEnv: 'Создайте файл .env в корне проекта',
            stepAddUrl: 'Добавьте URL Supabase: VITE_SUPABASE_URL=ваш_url',
            stepAddKey: 'Добавьте ключ Supabase: VITE_SUPABASE_ANON_KEY=ваш_ключ',
            stepRestart: 'Перезапустите сервер разработки',
            retryConnection: 'Повторить подключение',
            authRequired: 'Требуется авторизация',
            contactAdmin: 'Пожалуйста, обратитесь к системному администратору.',
        },

        navigation: {
            overview: 'Обзор',
            cases: 'Дела',
            analytics: 'Аналитика',
            messages: 'Сообщения',
            users: 'Пользователи',
            offices: 'Офисы',
            ai: 'ИИ Помощник',
            communication: 'Коммуникации',
        },

        offices: {                   // ← ДОБАВИТЬ НОВЫЙ РАЗДЕЛ
            title: 'Управление офисами',
            subtitle: 'Создавайте и управляйте офисами вашей компании',
            createOffice: 'Создать офис',
            newOffice: 'Новый офис',
            editOffice: 'Редактировать офис',
            deleteOffice: 'Удалить офис',
            officeName: 'Название офиса',
            officeCity: 'Город',
            city: 'Город',
            officeAddress: 'Адрес',
            officePhone: 'Телефон',
            officeEmail: 'Email',
            totalOffices: 'Всего офисов',
            totalEmployees: 'Всего сотрудников',
            activeEmployees: 'Активных сотрудников',
            averageSize: 'Средний размер',
            searchOffices: 'Поиск офисов...',
            noOfficesFound: 'Офисы не найдены',
            createFirstOffice: 'Создайте первый офис вашей компании',
            officeNameRequired: 'Название офиса обязательно',
            cityRequired: 'Город обязателен',
            deleteConfirm: 'Вы уверены, что хотите удалить этот офис? Все пользователи будут отвязаны от офиса.',
            deleteWarning: 'Все сотрудники будут отвязаны от офиса',
            contactInfo: 'Контактная информация',
            employeeStats: 'Статистика сотрудников',
            activeStatus: 'активных',
            createdDate: 'Дата создания',
            actions: 'Действия',
            edit: 'Редактировать',
            delete: 'Удалить',
            cancel: 'Отмена',
            save: 'Сохранить',
            create: 'Создать',
            loading: 'Загрузка офисов...',
            accessRestricted: 'Доступ ограничен',
            adminOnly: 'Только администраторы могут управлять офисами.'
        },

        dashboard: {
            welcomeBack: 'С возвращением,',
            systemAdmin: 'Системный администратор',
            legalProfessional: 'Юрист',
            totalCases: 'Всего дел',
            newRequests: 'Новые запросы',
            urgentCases: 'Срочные дела',
            unreadMessages: 'Сообщения',
            requiresAttention: 'Требует внимания',
            unreadMessagesText: 'Непрочитанные сообщения',
            highPriority: 'Высокий приоритет',
            activeCasesInSystem: 'Активные дела в системе',
            recentCases: 'Недавние дела',
            recentMessages: 'Недавние сообщения',
            noRecentCases: 'Нет недавних дел',
            noRecentMessages: 'Нет недавних сообщений',
            quickActions: 'Быстрые действия',
            manageCases: 'Управление делами',
            manageCasesDesc: 'Просмотр и назначение дел',
            viewAnalytics: 'Просмотр аналитики',
            viewAnalyticsDesc: 'Аналитика производительности',
            messagesDesc: 'Телеграм разговоры',
            telegramConversations: 'Телеграм разговоры',
            manageUsers: 'Управление пользователями',
            manageUsersDesc: 'Администрирование пользователей',
            userAdministration: 'Администрирование пользователей',
            performanceInsights: 'Аналитика производительности',
        },

        cases: {
            title: 'Управление делами',
            subtitle: 'Управление и отслеживание юридических дел',
            totalCases: 'Всего дел',
            client: 'Клиент',
            caseType: 'Тип дела',
            status: 'Статус',
            priority: 'Приоритет',
            assignedLawyer: 'Назначенный юрист',
            responseTime: 'Время ответа',
            created: 'Создано',
            searchCases: 'Поиск дел...',
            allStatuses: 'Все статусы',
            allPriorities: 'Все приоритеты',
            allLawyers: 'Все юристы',
            unassigned: 'Не назначено',
            clearFilters: 'Очистить фильтры',
            noCasesFound: 'Дела не найдены',
            noMatchingCases: 'Нет дел, соответствующих текущим фильтрам.',
            generalInquiry: 'Общий запрос',
            assignCase: 'Назначить дело',
            closeCase: 'Закрыть дело',
            rejectCase: 'Отклонить дело',
            deleteCase: 'Удалить дело',

            // Case statuses
            statusNew: 'Новое',
            statusAssigned: 'Назначено',
            statusInProgress: 'В работе',
            statusClosed: 'Закрыто',
            statusRejected: 'Отклонено',

            // Priorities
            priorityLow: 'Низкий',
            priorityMedium: 'Средний',
            priorityHigh: 'Высокий',
            priorityUrgent: 'Срочный',

            // Modals
            assignCaseTitle: 'Назначить дело',
            assignCaseText: 'Назначить дело юристу:',
            closeCaseTitle: 'Закрыть дело',
            closeCaseText: 'Закрыть дело:',
            closureReason: 'Причина закрытия *',
            closureReasonPlaceholder: 'Опишите, почему это дело закрывается...',
            clientSatisfactionRating: 'Рейтинг удовлетворенности клиента',
            satisfactionExcellent: '5 - Отлично',
            satisfactionGood: '4 - Хорошо',
            satisfactionAverage: '3 - Средне',
            satisfactionPoor: '2 - Плохо',
            satisfactionVeryPoor: '1 - Очень плохо',
            rejectCaseTitle: 'Отклонить дело',
            rejectCaseText: 'Отклонить дело:',
            rejectionReason: 'Причина отклонения *',
            rejectionReasonPlaceholder: 'Опишите, почему это дело отклоняется...',

            // Confirmation dialogs
            deleteConfirm: 'Вы уверены, что хотите удалить это дело? Это действие нельзя отменить.',
            cannotUndo: 'Это действие нельзя отменить.',
        },

        analytics: {
            title: 'Панель аналитики',
            subtitle: 'Метрики производительности и аналитика',
            timeRange: 'Временной диапазон',
            office: 'Офис',
            last7Days: 'Последние 7 дней',
            last30Days: 'Последние 30 дней',
            last90Days: 'Последние 90 дней',
            lastYear: 'Последний год',
            allOffices: 'Все офисы',

            // Key metrics
            totalCases: 'Всего дел',
            closedCases: 'Закрытые дела',
            avgResponseTime: 'Среднее время ответа',
            satisfactionRating: 'Рейтинг удовлетворенности',
            outOf5: 'из 5.0',
            completionRate: 'процент завершения',
            timeToFirstResponse: 'Время до первого ответа',

            // Case status distribution
            caseStatusDistribution: 'Распределение статусов дел',
            newRequests: 'Новые запросы',
            inProgress: 'В работе',
            closed: 'Закрыто',
            rejected: 'Отклонено',

            // Office performance
            officePerformance: 'Производительность офисов',
            avgResponse: 'Ср. ответ',
            rating: 'Рейтинг',

            // Lawyer performance
            lawyerPerformance: 'Производительность юристов',
            noPerformanceData: 'Нет данных о производительности юристов',
            lawyer: 'Юрист',
            totalCasesCol: 'Всего дел',
            closedCol: 'Закрыто',
            rejectedCol: 'Отклонено',
            activeCol: 'Активные',
            avgResponseCol: 'Ср. ответ',
            ratingCol: 'Рейтинг',

            // Time formatting
            minutes: 'м',
            hours: 'ч',
        },

        users: {
            title: 'Управление пользователями',
            subtitle: 'Управление пользователями системы и разрешениями',
            addUser: 'Добавить пользователя',
            searchUsers: 'Поиск пользователей...',
            allRoles: 'Все роли',
            allOffices: 'Все офисы',
            allStatuses: 'Все статусы',
            clearFilters: 'Очистить фильтры',
            noUsersFound: 'Пользователи не найдены',
            noMatchingUsers: 'Нет пользователей, соответствующих текущим фильтрам.',

            // Table headers
            user: 'Пользователь',
            role: 'Роль',
            office: 'Офис',
            status: 'Статус',
            created: 'Создано',
            lastLogin: 'Последний вход',
            actions: 'Действия',

            // Roles
            admin: 'Администратор',
            lawyer: 'Юрист',
            client: 'Клиент',

            // Status
            active: 'Активный',
            inactive: 'Неактивный',
            never: 'Никогда',
            noOffice: 'Нет офиса',

            // Modals
            createNewUser: 'Создать нового пользователя',
            editUser: 'Редактировать пользователя',
            nameRequired: 'Имя *',
            emailRequired: 'Email *',
            roleRequired: 'Роль *',
            activeUser: 'Активный пользователь',
            createUser: 'Создать пользователя',
            updateUser: 'Обновить пользователя',

            // Access restriction
            accessRestricted: 'Доступ ограничен',
            adminOnly: 'Только администраторы могут управлять пользователями.',
            activateUser: 'Активировать пользователя',
            deactivateUser: 'Деактивировать пользователя',
        },

        telegram: {
            title: 'Телеграм Бот',
            botToken: 'Токен бота',
            botTokenRequired: 'Требуется токен бота',
            botTokenDesc: 'Пожалуйста, предоставьте действительный токен Телеграм бота для использования функций сообщений.',
            connecting: 'Подключение...',
            connected: 'Подключено',
            disconnected: 'Отключено',
            polling: 'Опрос',
            errors: 'ошибки',
            refreshMessages: 'Обновить сообщения',
            reconnect: 'Переподключиться',

            // Chat interface
            systemMessages: 'Системные сообщения',
            noUserConversations: 'Нет пользовательских разговоров',
            messagesWillAppear: 'Сообщения появятся здесь',
            unknownChat: 'Неизвестный чат',
            secureStored: 'Безопасно сохранено',
            secureStoredSupabase: 'Безопасно сохранено в Supabase',
            typeMessage: 'Введите ваше сообщение...',
            enterToSend: 'Enter для отправки, Shift+Enter для новой строки',
            shiftEnterNewLine: 'Shift+Enter для новой строки',
            edited: 'изменено',

            // Bot info
            botUsername: 'Имя пользователя бота:',
            directLink: 'Прямая ссылка:',
            usersCanMessage: 'Пользователи могут найти и написать вашему боту, используя это имя пользователя',
            allMessagesStored: 'Все разговоры автоматически сохраняются в базу данных Supabase',

            // Connection messages
            connectedToBot: 'Подключено к боту:',
            botLink: 'Ссылка на бота:',
            usersCanMessageBot: 'Пользователи теперь могут писать вашему боту для начала разговоров',
            messagesAutoSaved: 'Все сообщения автоматически сохраняются в базу данных Supabase',
            connectionFailed: 'Не удалось подключиться к Telegram API. Это может быть связано с ограничениями безопасности браузера.',
            browserRestrictions: 'Примечание: Из-за ограничений безопасности браузера прямой доступ к Telegram API может быть ограничен. Рассмотрите использование серверного прокси для продакшн использования.',
            serverProxyNote: 'Примечание: Из-за ограничений безопасности браузера прямой доступ к Telegram API может быть ограничен. Рассмотрите использование серверного прокси для продакшн использования.',
            startedPolling: 'Начат опрос сообщений...',
            newMessageFrom: 'Новое сообщение от',
            messageEdited: 'Сообщение изменено',
            messageSent: 'Сообщение отправлено успешно',
            messageFailed: 'Не удалось отправить сообщение. Проблемы с сетевым подключением.',
            networkIssues: 'Опрос испытывает проблемы с подключением. Повторная попытка...',
            pollingStopped: 'Опрос остановлен после последовательных ошибок. Нажмите обновить для повтора.',
            manualRefresh: 'Ручная проверка новых сообщений...',
            refreshCompleted: 'Ручное обновление завершено',
            refreshFailed: 'Ручное обновление не удалось. Проблемы с сетевым подключением.',

            // Delete conversation
            deleteConversation: 'Удалить разговор',
            deleteConfirm: 'Вы уверены, что хотите удалить этот разговор?',
            deleteWarning: 'Внимание: Это действие нельзя отменить. Все сообщения в этом разговоре будут навсегда удалены из базы данных.',
            deleting: 'Удаление...',
            conversationDeleted: 'Удален разговор:',
            deleteFailed: 'Не удалось удалить разговор:',
            noAssignedCases: 'Нет доступных разговоров. Вы можете видеть только разговоры по делам, назначенным вам.',
        },

        invitation: {
            // Basic invitation
            inviteUser: 'Пригласить пользователя',
            invitationEmail: 'Email приглашения',
            roleForInvitedUser: 'Роль для приглашенного пользователя',
            sendInvitation: 'Отправить приглашение',
            sendingInvitation: 'Отправка приглашения...',
            invitationSent: 'Приглашение отправлено успешно! Пользователь получит ссылку для регистрации.',
            invitationError: 'Ошибка приглашения',
            invitationResent: 'Приглашение отправлено повторно!',

            // Invitation management
            pendingInvitations: 'Ожидающие приглашения',
            pendingInvitationsDesc: 'Пользователи, которые были приглашены, но еще не зарегистрировались',
            sentBy: 'Отправлено',
            expiresAt: 'Истекает',
            resendInvitation: 'Отправить повторно',
            deleteInvitation: 'Удалить приглашение',
            deleteConfirm: 'Вы уверены, что хотите удалить это приглашение?',

            // Registration process
            completeRegistration: 'Завершить регистрацию',
            invitedToJoin: 'Вас пригласили присоединиться к LegalFlow',
            invitationDetails: 'Детали приглашения',
            fullName: 'Полное имя',
            enterFullName: 'Введите ваше полное имя',
            password: 'Пароль',
            enterPassword: 'Введите ваш пароль',
            confirmPassword: 'Подтвердите пароль',
            confirmPasswordPlaceholder: 'Введите пароль еще раз',
            createAccount: 'Создать аккаунт',
            creatingAccount: 'Создание аккаунта...',
            registrationSuccess: 'Регистрация завершена успешно!',
            redirecting: 'Перенаправление на панель управления...',
            securityNotice: 'Ваши данные защищены шифрованием и соответствуют стандартам безопасности.',

            // Validation messages
            nameRequired: 'Полное имя обязательно',
            nameTooShort: 'Имя должно содержать не менее 2 символов',
            passwordRequired: 'Пароль обязателен',
            passwordTooShort: 'Пароль должен содержать не менее 6 символов',
            confirmPasswordRequired: 'Подтверждение пароля обязательно',
            passwordsDoNotMatch: 'Пароли не совпадают',

            // Error states
            verifying: 'Проверка приглашения',
            verifyingSubtext: 'Проверка действительности вашего приглашения...',
            invalidOrExpired: 'Недействительное или истекшее приглашение',
            loadError: 'Не удалось загрузить приглашение',
            registrationError: 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.',
            possibleReasons: 'Возможные причины:',
            reasonExpired: 'Срок действия приглашения истек',
            reasonAlreadyUsed: 'Приглашение уже было использовано',
            reasonInvalidLink: 'Недействительная ссылка приглашения',
        },

        ai: {
            title: 'ИИ Юридический помощник',
            subtitle: 'Работает на продвинутом юридическом ИИ с соблюдением этики',
            ethicsCompliant: 'Соответствует этике',
            newCaseChat: 'Новый чат по делу',

            // Features
            legalResearch: 'Юридические исследования',
            legalResearchDesc: 'Получите комплексные юридические исследования по законам, судебной практике и регламентам',
            documentAnalysis: 'Анализ документов',
            documentAnalysisDesc: 'Анализируйте контракты, соглашения и юридические документы для получения ключевых данных',
            caseAssessment: 'Оценка дела',
            caseAssessmentDesc: 'Предварительная оценка дела и рекомендации по стратегии',
            caseSpecificChat: 'Чат по конкретному делу',
            caseSpecificChatDesc: 'Индивидуальные ИИ помощники для каждого дела с полным контекстом',

            // Usage stats
            queriesThisMonth: 'запросов в этом месяце',
            documentsAnalyzed: 'документов проанализировано',
            assessmentsCompleted: 'оценок завершено',
            activeConversations: 'активных разговоров',

            // Recent conversations
            recentConversations: 'Недавние разговоры по делам',
            viewAll: 'Посмотреть все →',
            selectCaseChat: 'Выберите чат по делу',
            chooseConversation: 'Выберите разговор по делу для продолжения или начните новый',
            startNew: '+ Новый',

            // Ethics notice
            ethicsNoticeTitle: 'Уведомление об этике и соответствии',
            ethicsNotice: 'Этот ИИ помощник предоставляет общие юридические исследования и анализ документов. Все выходные данные должны быть проверены квалифицированными юристами. Конфиденциальность клиентов и адвокатско-клиентская привилегия поддерживаются через зашифрованную обработку и безопасное обращение с данными.',
        },

        communication: {
            title: 'Центр коммуникаций',
            telegramBot: 'Телеграм Бот',
            telegramBotDesc: 'Прямой интерфейс сообщений с безопасной связью через Телеграм бота, постоянным хранением и хронологической сортировкой сообщений',
            ready: 'Готов',
            openArrow: 'Открыть →',
            additionalChannels: 'Дополнительные каналы связи',
            comingSoon: 'Скоро',
            communicationFeatures: 'Функции связи',

            // Telegram features
            realTimePolling: 'Опрос сообщений в реальном времени',
            chronologicalSorting: 'Хронологическая сортировка сообщений',
            duplicateHandling: 'Обработка дублирующихся сообщений',
            editSupport: 'Поддержка редактирования сообщений',
            multipleChatManagement: 'Управление несколькими чатами',
            networkRecovery: 'Восстановление сетевых ошибок',
            persistentStorage: 'Постоянное хранение сообщений',
            encryptedDatabase: 'Зашифрованная локальная база данных',
            fullHistory: 'Полная история разговоров',
            messageSearch: 'Возможности поиска сообщений',

            // Database features
            databaseFeatures: 'Функции базы данных',
            automaticBackup: 'Автоматическое резервное копирование сообщений',
            conversationThreading: 'Потоки разговоров',
            statusTracking: 'Отслеживание статуса сообщений',
            timestampPreservation: 'Сохранение временных меток',
            editHistory: 'Управление историей редактирования',
            secureEncryption: 'Безопасное шифрование данных',

            // Security notice
            securityPrivacy: 'Безопасность и конфиденциальность',
            securityNotice: 'Вся связь через Телеграм хранится локально с AES шифрованием и автоматическими возможностями резервного копирования. История сообщений сохраняется при соблюдении адвокатско-клиентской привилегии и норм конфиденциальности данных.',
        },

        formats: {
            date: 'дд.мм.гггг',
            time: 'чч:мм',
            datetime: 'дд.мм.гггг чч:мм',
            currency: '₽',
            percentage: '%',
        },
    },

    en: {
        common: {
            loading: 'Loading',
            error: 'Error',
            success: 'Success',
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            create: 'Create',
            update: 'Update',
            search: 'Search',
            filter: 'Filter',
            clear: 'Clear',
            refresh: 'Refresh',
            send: 'Send',
            yes: 'Yes',
            no: 'No',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            close: 'Close',
            open: 'Open',
            view: 'View',
            download: 'Download',
            upload: 'Upload',
            retry: 'Retry',
            confirm: 'Confirm',
            status: 'Status',
            name: 'Name',
            email: 'Email',
            phone: 'Phone',
            address: 'Address',
            date: 'Date',
            time: 'Time',
            type: 'Type',
            priority: 'Priority',
            description: 'Description',
            notes: 'Notes',
            actions: 'Actions',
            details: 'Details',
            total: 'Total',
            active: 'Active',
            inactive: 'Inactive',
            all: 'All',
            none: 'None',
            required: 'Required',
            optional: 'Optional',
            connecting: 'Connecting',
            connected: 'Connected',
            disconnected: 'Disconnected',
        },

        app: {
            title: 'LegalFlow - Telegram Communication',
            subtitle: 'Secure Telegram bot communication system for legal professionals',
            signIn: 'Sign In',
            signOut: 'Sign Out',
            signingIn: 'Signing in...',
            initializing: 'Initializing LegalFlow',
            initializingSubtext: 'Setting up your legal case management system...',
            dbConnectionIssue: 'Database Connection Issue',
            dbConnectionSteps: 'Configuration Steps:',
            stepCreateEnv: 'Create a .env file in your project root',
            stepAddUrl: 'Add your Supabase URL: VITE_SUPABASE_URL=your_url',
            stepAddKey: 'Add your Supabase anon key: VITE_SUPABASE_ANON_KEY=your_key',
            stepRestart: 'Restart the development server',
            retryConnection: 'Retry Connection',
            authRequired: 'Authentication Required',
            contactAdmin: 'Please contact your system administrator.',
        },

        navigation: {
            overview: 'Overview',
            cases: 'Cases',
            analytics: 'Analytics',
            messages: 'Messages',
            users: 'Users',
            ai: 'AI Assistant',
            communication: 'Communication',
        },

        dashboard: {
            welcomeBack: 'Welcome back,',
            systemAdmin: 'System Administrator',
            legalProfessional: 'Legal Professional',
            totalCases: 'Total Cases',
            newRequests: 'New Requests',
            urgentCases: 'Urgent Cases',
            unreadMessages: 'Messages',
            requiresAttention: 'Requires attention',
            unreadMessagesText: 'Unread messages',
            highPriority: 'High priority',
            activeCasesInSystem: 'Active cases in system',
            recentCases: 'Recent Cases',
            recentMessages: 'Recent Messages',
            noRecentCases: 'No recent cases',
            noRecentMessages: 'No recent messages',
            quickActions: 'Quick Actions',
            manageCases: 'Manage Cases',
            manageCasesDesc: 'View and assign cases',
            viewAnalytics: 'View Analytics',
            viewAnalyticsDesc: 'Performance insights',
            messagesDesc: 'Telegram conversations',
            telegramConversations: 'Telegram conversations',
            manageUsers: 'Manage Users',
            manageUsersDesc: 'User administration',
            userAdministration: 'User administration',
            performanceInsights: 'Performance insights',
        },

        cases: {
            title: 'Case Management',
            subtitle: 'Manage and track legal cases',
            totalCases: 'Total Cases',
            client: 'Client',
            caseType: 'Case Type',
            status: 'Status',
            priority: 'Priority',
            assignedLawyer: 'Assigned Lawyer',
            responseTime: 'Response Time',
            created: 'Created',
            searchCases: 'Search cases...',
            allStatuses: 'All Statuses',
            allPriorities: 'All Priorities',
            allLawyers: 'All Lawyers',
            unassigned: 'Unassigned',
            clearFilters: 'Clear Filters',
            noCasesFound: 'No cases found',
            noMatchingCases: 'No cases match your current filters.',
            generalInquiry: 'General Inquiry',
            assignCase: 'Assign Case',
            closeCase: 'Close Case',
            rejectCase: 'Reject Case',
            deleteCase: 'Delete Case',

            // Case statuses
            statusNew: 'New',
            statusAssigned: 'Assigned',
            statusInProgress: 'In Progress',
            statusClosed: 'Closed',
            statusRejected: 'Rejected',

            // Priorities
            priorityLow: 'Low',
            priorityMedium: 'Medium',
            priorityHigh: 'High',
            priorityUrgent: 'Urgent',

            // Modals
            assignCaseTitle: 'Assign Case',
            assignCaseText: 'Assign case to a lawyer:',
            closeCaseTitle: 'Close Case',
            closeCaseText: 'Close case:',
            closureReason: 'Closure Reason *',
            closureReasonPlaceholder: 'Describe why this case is being closed...',
            clientSatisfactionRating: 'Client Satisfaction Rating',
            satisfactionExcellent: '5 - Excellent',
            satisfactionGood: '4 - Good',
            satisfactionAverage: '3 - Average',
            satisfactionPoor: '2 - Poor',
            satisfactionVeryPoor: '1 - Very Poor',
            rejectCaseTitle: 'Reject Case',
            rejectCaseText: 'Reject case:',
            rejectionReason: 'Rejection Reason *',
            rejectionReasonPlaceholder: 'Describe why this case is being rejected...',

            // Confirmation dialogs
            deleteConfirm: 'Are you sure you want to delete this case? This action cannot be undone.',
            cannotUndo: 'This action cannot be undone.',
        },

        analytics: {
            title: 'Analytics Dashboard',
            subtitle: 'Performance metrics and insights',
            timeRange: 'Time Range',
            office: 'Office',
            last7Days: 'Last 7 days',
            last30Days: 'Last 30 days',
            last90Days: 'Last 90 days',
            lastYear: 'Last year',
            allOffices: 'All Offices',

            // Key metrics
            totalCases: 'Total Cases',
            closedCases: 'Closed Cases',
            avgResponseTime: 'Avg Response Time',
            satisfactionRating: 'Satisfaction Rating',
            outOf5: 'Out of 5.0',
            completionRate: 'completion rate',
            timeToFirstResponse: 'Time to first response',

            // Case status distribution
            caseStatusDistribution: 'Case Status Distribution',
            newRequests: 'New Requests',
            inProgress: 'In Progress',
            closed: 'Closed',
            rejected: 'Rejected',

            // Office performance
            officePerformance: 'Office Performance',
            avgResponse: 'Avg Response',
            rating: 'Rating',

            // Lawyer performance
            lawyerPerformance: 'Lawyer Performance',
            noPerformanceData: 'No lawyer performance data available',
            lawyer: 'Lawyer',
            totalCasesCol: 'Total Cases',
            closedCol: 'Closed',
            rejectedCol: 'Rejected',
            activeCol: 'Active',
            avgResponseCol: 'Avg Response',
            ratingCol: 'Rating',

            // Time formatting
            minutes: 'm',
            hours: 'h',
        },

        users: {
            title: 'User Management',
            subtitle: 'Manage system users and permissions',
            addUser: 'Add User',
            searchUsers: 'Search users...',
            allRoles: 'All Roles',
            allOffices: 'All Offices',
            allStatuses: 'All Statuses',
            clearFilters: 'Clear Filters',
            noUsersFound: 'No users found',
            noMatchingUsers: 'No users match your current filters.',

            // Table headers
            user: 'User',
            role: 'Role',
            office: 'Office',
            status: 'Status',
            created: 'Created',
            lastLogin: 'Last Login',
            actions: 'Actions',

            // Roles
            admin: 'Admin',
            lawyer: 'Lawyer',
            client: 'Client',

            // Status
            active: 'Active',
            inactive: 'Inactive',
            never: 'Never',
            noOffice: 'No office',

            // Modals
            createNewUser: 'Create New User',
            editUser: 'Edit User',
            nameRequired: 'Name *',
            emailRequired: 'Email *',
            roleRequired: 'Role *',
            activeUser: 'Active user',
            createUser: 'Create User',
            updateUser: 'Update User',

            // Access restriction
            accessRestricted: 'Access Restricted',
            adminOnly: 'Only administrators can manage users.',
            activateUser: 'Activate User',
            deactivateUser: 'Deactivate User',
        },

        telegram: {
            title: 'Telegram Bot',
            botToken: 'Bot Token',
            botTokenRequired: 'Bot Token Required',
            botTokenDesc: 'Please provide a valid Telegram bot token to use messaging features.',
            connecting: 'Connecting...',
            connected: 'Connected',
            disconnected: 'Disconnected',
            polling: 'Polling',
            errors: 'errors',
            refreshMessages: 'Refresh messages',
            reconnect: 'Reconnect',

            // Chat interface
            systemMessages: 'System Messages',
            noUserConversations: 'No user conversations',
            messagesWillAppear: 'Messages will appear here',
            unknownChat: 'Unknown Chat',
            secureStored: 'Secure & Stored',
            secureStoredSupabase: 'Secure & Stored in Supabase',
            typeMessage: 'Type your message...',
            enterToSend: 'Press Enter to send, Shift+Enter for new line',
            shiftEnterNewLine: 'Shift+Enter for new line',
            edited: 'edited',

            // Bot info
            botUsername: 'Bot Username:',
            directLink: 'Direct link:',
            usersCanMessage: 'Users can find and message your bot using this username',
            allMessagesStored: 'All conversations are automatically saved to Supabase database',

            // Connection messages
            connectedToBot: 'Connected to bot:',
            botLink: 'Bot link:',
            usersCanMessageBot: 'Users can now message your bot to start conversations',
            messagesAutoSaved: 'All messages are automatically saved to Supabase database',
            connectionFailed: 'Unable to connect to Telegram API. This may be due to browser security restrictions.',
            browserRestrictions: 'Note: Due to browser security restrictions, direct Telegram API access may be limited. Consider using a server-side proxy for production use.',
            serverProxyNote: 'Note: Due to browser security restrictions, direct Telegram API access may be limited. Consider using a server-side proxy for production use.',
            startedPolling: 'Started polling for messages...',
            newMessageFrom: 'New message from',
            messageEdited: 'Message edited by',
            messageSent: 'Message sent successfully',
            messageFailed: 'Failed to send message. Network connectivity issues.',
            networkIssues: 'Polling experiencing connectivity issues. Retrying...',
            pollingStopped: 'Polling stopped after consecutive errors. Click refresh to retry.',
            manualRefresh: 'Manually checking for new messages...',
            refreshCompleted: 'Manual refresh completed',
            refreshFailed: 'Manual refresh failed. Network connectivity issues.',

            // Delete conversation
            deleteConversation: 'Delete Conversation',
            deleteConfirm: 'Are you sure you want to delete this conversation?',
            deleteWarning: 'Warning: This action cannot be undone. All messages in this conversation will be permanently deleted from the database.',
            deleting: 'Deleting...',
            conversationDeleted: 'Deleted conversation:',
            deleteFailed: 'Failed to delete conversation:',
            noAssignedCases: 'No conversations available. You can only access conversations for cases assigned to you.',
        },

        invitation: {
            // Basic invitation
            inviteUser: 'Invite User',
            invitationEmail: 'Invitation Email',
            roleForInvitedUser: 'Role for Invited User',
            sendInvitation: 'Send Invitation',
            sendingInvitation: 'Sending invitation...',
            invitationSent: 'Invitation sent successfully! The user will receive a registration link.',
            invitationError: 'Invitation Error',
            invitationResent: 'Invitation resent successfully!',

            // Invitation management
            pendingInvitations: 'Pending Invitations',
            pendingInvitationsDesc: 'Users who have been invited but have not yet registered',
            sentBy: 'Sent By',
            expiresAt: 'Expires At',
            resendInvitation: 'Resend Invitation',
            deleteInvitation: 'Delete Invitation',
            deleteConfirm: 'Are you sure you want to delete this invitation?',

            // Registration process
            completeRegistration: 'Complete Registration',
            invitedToJoin: 'You have been invited to join LegalFlow',
            invitationDetails: 'Invitation Details',
            fullName: 'Full Name',
            enterFullName: 'Enter your full name',
            password: 'Password',
            enterPassword: 'Enter your password',
            confirmPassword: 'Confirm Password',
            confirmPasswordPlaceholder: 'Enter your password again',
            createAccount: 'Create Account',
            creatingAccount: 'Creating account...',
            registrationSuccess: 'Registration completed successfully!',
            redirecting: 'Redirecting to dashboard...',
            securityNotice: 'Your data is protected with encryption and meets security standards.',

            // Validation messages
            nameRequired: 'Full name is required',
            nameTooShort: 'Name must be at least 2 characters long',
            passwordRequired: 'Password is required',
            passwordTooShort: 'Password must be at least 6 characters long',
            confirmPasswordRequired: 'Password confirmation is required',
            passwordsDoNotMatch: 'Passwords do not match',

            // Error states
            verifying: 'Verifying Invitation',
            verifyingSubtext: 'Checking the validity of your invitation...',
            invalidOrExpired: 'Invalid or expired invitation',
            loadError: 'Failed to load invitation',
            registrationError: 'Registration failed. Please try again.',
            possibleReasons: 'Possible reasons:',
            reasonExpired: 'The invitation has expired',
            reasonAlreadyUsed: 'The invitation has already been used',
            reasonInvalidLink: 'Invalid invitation link',
        },

        ai: {
            title: 'AI Legal Assistant',
            subtitle: 'Powered by advanced legal AI with ethics compliance',
            ethicsCompliant: 'Ethics Compliant',
            newCaseChat: 'New Case Chat',

            // Features
            legalResearch: 'Legal Research',
            legalResearchDesc: 'Get comprehensive legal research on statutes, case law, and regulations',
            documentAnalysis: 'Document Analysis',
            documentAnalysisDesc: 'Analyze contracts, agreements, and legal documents for key insights',
            caseAssessment: 'Case Assessment',
            caseAssessmentDesc: 'Preliminary case evaluation and strategy recommendations',
            caseSpecificChat: 'Case-Specific Chat',
            caseSpecificChatDesc: 'Individual AI assistants for each case with full context',

            // Usage stats
            queriesThisMonth: 'queries this month',
            documentsAnalyzed: 'documents analyzed',
            assessmentsCompleted: 'assessments completed',
            activeConversations: 'active conversations',

            // Recent conversations
            recentConversations: 'Recent Case Conversations',
            viewAll: 'View all →',
            selectCaseChat: 'Select a case chat',
            chooseConversation: 'Choose a case conversation to continue or start a new one',
            startNew: '+ New',

            // Ethics notice
            ethicsNoticeTitle: 'Ethics & Compliance Notice',
            ethicsNotice: 'This AI assistant provides general legal research and document analysis. All outputs should be reviewed by qualified legal professionals. Client confidentiality and attorney-client privilege are maintained through encrypted processing and secure data handling.',
        },

        communication: {
            title: 'Communication Hub',
            telegramBot: 'Telegram Bot',
            telegramBotDesc: 'Direct messaging interface with secure Telegram bot communication, persistent storage, and chronological message sorting',
            ready: 'Ready',
            openArrow: 'Open →',
            additionalChannels: 'Additional communication channels',
            comingSoon: 'Coming soon',
            communicationFeatures: 'Communication Features',

            // Telegram features
            realTimePolling: 'Real-time message polling',
            chronologicalSorting: 'Chronological message sorting',
            duplicateHandling: 'Duplicate message handling',
            editSupport: 'Edit message support',
            multipleChatManagement: 'Multiple chat management',
            networkRecovery: 'Network error recovery',
            persistentStorage: 'Persistent message storage',
            encryptedDatabase: 'Encrypted local database',
            fullHistory: 'Full conversation history',
            messageSearch: 'Message search capabilities',

            // Database features
            databaseFeatures: 'Database Features',
            automaticBackup: 'Automatic message backup',
            conversationThreading: 'Conversation threading',
            statusTracking: 'Message status tracking',
            timestampPreservation: 'Timestamp preservation',
            editHistory: 'Edit history management',
            secureEncryption: 'Secure data encryption',

            // Security notice
            securityPrivacy: 'Security & Privacy',
            securityNotice: 'All Telegram communications are stored locally with AES encryption and automatic backup capabilities. Message history is preserved while maintaining attorney-client privilege and data privacy regulations compliance.',
        },

        formats: {
            date: 'MM/DD/YYYY',
            time: 'HH:mm',
            datetime: 'MM/DD/YYYY HH:mm',
            currency: '$',
            percentage: '%',
        },
    },
};

// Current language - default to Russian
export let currentLanguage: Language = 'ru';

export const setLanguage = (lang: Language) => {
    currentLanguage = lang;
};

export const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage];

    for (const k of keys) {
        value = value?.[k];
    }

    return typeof value === 'string' ? value : key;
};

// Helper function for formatting
export const formatCurrency = (amount: number): string => {
    const currency = t('formats.currency');
    return `${amount.toLocaleString()} ${currency}`;
};

export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ru-RU');
};

export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
};

export const formatDateTime = (date: Date): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
};