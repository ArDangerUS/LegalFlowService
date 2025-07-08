-- Полная миграция для системы ролей и приглашений
-- Выполнить по порядку для настройки всей системы

-- 1. Обновление существующих типов
DO $$
BEGIN
    -- Добавляем роль office_admin если её нет
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'office_admin', 'lawyer', 'client');
    ELSE
        -- Добавляем office_admin к существующему типу
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'office_admin';
    END IF;
END $$;

-- 2. Обновление таблицы пользователей
ALTER TABLE users
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_office_role ON users(office_id, role);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role);

-- 3. Создание таблицы приглашений
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Индексы для таблицы приглашений
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_office ON invitations(office_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- 4. Создание таблицы прав доступа
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    scope VARCHAR(20) DEFAULT 'all', -- 'all', 'office', 'own'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(role, permission, resource)
);

-- 5. Настройка прав доступа для каждой роли

-- Удаляем существующие права, если есть
TRUNCATE role_permissions;

-- ГЛАВНЫЙ АДМИН (admin) - полный доступ ко всему
INSERT INTO role_permissions (role, permission, resource, scope) VALUES
-- Управление офисами
('admin', 'create', 'offices', 'all'),
('admin', 'read', 'offices', 'all'),
('admin', 'update', 'offices', 'all'),
('admin', 'delete', 'offices', 'all'),

-- Управление пользователями
('admin', 'create', 'users', 'all'),
('admin', 'read', 'users', 'all'),
('admin', 'update', 'users', 'all'),
('admin', 'delete', 'users', 'all'),

-- Управление приглашениями
('admin', 'create', 'invitations', 'all'),
('admin', 'read', 'invitations', 'all'),
('admin', 'update', 'invitations', 'all'),
('admin', 'delete', 'invitations', 'all'),

-- Управление делами
('admin', 'create', 'cases', 'all'),
('admin', 'read', 'cases', 'all'),
('admin', 'update', 'cases', 'all'),
('admin', 'delete', 'cases', 'all'),
('admin', 'assign', 'cases', 'all'),

-- Телеграм сообщения
('admin', 'read', 'telegram_messages', 'all'),
('admin', 'send', 'telegram_messages', 'all'),
('admin', 'delete', 'telegram_messages', 'all'),

-- Аналитика
('admin', 'read', 'analytics', 'all'),

-- Настройки системы
('admin', 'read', 'settings', 'all'),
('admin', 'update', 'settings', 'all');

-- АДМИН ОФИСА (office_admin) - управление своим офисом
INSERT INTO role_permissions (role, permission, resource, scope) VALUES
-- Управление своим офисом
('office_admin', 'read', 'offices', 'own'),
('office_admin', 'update', 'offices', 'own'),

-- Управление пользователями своего офиса
('office_admin', 'read', 'users', 'office'),
('office_admin', 'update', 'users', 'office'),

-- Приглашения в свой офис
('office_admin', 'create', 'invitations', 'office'),
('office_admin', 'read', 'invitations', 'office'),
('office_admin', 'update', 'invitations', 'office'),
('office_admin', 'delete', 'invitations', 'office'),

-- Управление делами офиса
('office_admin', 'create', 'cases', 'office'),
('office_admin', 'read', 'cases', 'office'),
('office_admin', 'update', 'cases', 'office'),
('office_admin', 'assign', 'cases', 'office'),

-- Телеграм сообщения офиса
('office_admin', 'read', 'telegram_messages', 'office'),
('office_admin', 'send', 'telegram_messages', 'office'),

-- Аналитика офиса
('office_admin', 'read', 'analytics', 'office');

-- ЮРИСТ (lawyer) - доступ к делам и данным офиса
INSERT INTO role_permissions (role, permission, resource, scope) VALUES
-- Просмотр дел офиса и работа со своими
('lawyer', 'read', 'cases', 'office'),
('lawyer', 'update', 'cases', 'own'),

-- Телеграм сообщения офиса
('lawyer', 'read', 'telegram_messages', 'office'),
('lawyer', 'send', 'telegram_messages', 'office'),

-- Просмотр коллег по офису
('lawyer', 'read', 'users', 'office'),

-- Собственная аналитика
('lawyer', 'read', 'analytics', 'own');

-- КЛИЕНТ (client) - ограниченный доступ
INSERT INTO role_permissions (role, permission, resource, scope) VALUES
-- Только свои дела
('client', 'read', 'cases', 'own'),

-- Только свои сообщения
('client', 'read', 'telegram_messages', 'own'),
('client', 'send', 'telegram_messages', 'own');

-- 6. Функции для проверки прав доступа
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id UUID,
    permission_name VARCHAR(50),
    resource_name VARCHAR(50),
    resource_office_id UUID DEFAULT NULL,
    resource_owner_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
    user_office_id UUID;
    permission_scope VARCHAR(20);
BEGIN
    -- Получаем роль и офис пользователя
    SELECT role, office_id INTO user_role, user_office_id
    FROM users WHERE id = user_id AND is_active = true;

    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Получаем scope для данного права
    SELECT scope INTO permission_scope
    FROM role_permissions
    WHERE role = user_role
    AND permission = permission_name
    AND resource = resource_name;

    IF permission_scope IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Проверяем права в зависимости от scope
    CASE permission_scope
        WHEN 'all' THEN
            RETURN TRUE;
        WHEN 'office' THEN
            RETURN user_office_id IS NOT NULL AND
                   (resource_office_id IS NULL OR user_office_id = resource_office_id);
        WHEN 'own' THEN
            RETURN (resource_owner_id IS NOT NULL AND user_id = resource_owner_id) OR
                   (resource_office_id IS NOT NULL AND user_office_id = resource_office_id);
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для создания приглашения с проверкой прав
CREATE OR REPLACE FUNCTION create_invitation_with_permissions(
    p_email VARCHAR(255),
    p_role user_role,
    p_office_id UUID,
    p_invited_by UUID
) RETURNS UUID AS $$
DECLARE
    inviter_role user_role;
    inviter_office_id UUID;
    invitation_id UUID;
    token_value VARCHAR(64);
BEGIN
    -- Получаем данные приглашающего
    SELECT role, office_id INTO inviter_role, inviter_office_id
    FROM users WHERE id = p_invited_by AND is_active = true;

    IF inviter_role IS NULL THEN
        RAISE EXCEPTION 'Inviter not found or inactive';
    END IF;

    -- Проверяем права на создание приглашения
    IF inviter_role = 'admin' THEN
        -- Админ может приглашать кого угодно куда угодно
        NULL;
    ELSIF inviter_role = 'office_admin' THEN
        -- Админ офиса может приглашать только в свой офис
        IF inviter_office_id IS NULL OR p_office_id != inviter_office_id THEN
            RAISE EXCEPTION 'Office admin can only invite to their own office';
        END IF;
        -- Админ офиса не может создавать других админов
        IF p_role = 'admin' THEN
            RAISE EXCEPTION 'Office admin cannot create system administrators';
        END IF;
    ELSE
        RAISE EXCEPTION 'User does not have permission to create invitations';
    END IF;

    -- Проверяем, нет ли уже пользователя с таким email
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Проверяем, нет ли активного приглашения
    IF EXISTS (
        SELECT 1 FROM invitations
        WHERE email = p_email
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Active invitation already exists for this email';
    END IF;

    -- Генерируем уникальный токен
    token_value := encode(gen_random_bytes(32), 'hex');

    -- Создаем приглашение
    INSERT INTO invitations (email, role, office_id, invited_by, token, expires_at)
    VALUES (p_email, p_role, p_office_id, p_invited_by, token_value, NOW() + INTERVAL '7 days')
    RETURNING id INTO invitation_id;

    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Обновление RLS политик

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to manage users" ON users;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read cases" ON cases;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to manage cases" ON cases;

-- Политики для пользователей
CREATE POLICY "Users can read users based on their role and office"
    ON users FOR SELECT
    USING (
        -- Может видеть себя
        auth.uid()::uuid = id
        OR
        -- Или если есть права на просмотр
        check_user_permission(
            auth.uid()::uuid,
            'read',
            'users',
            office_id,
            id
        )
    );

CREATE POLICY "Users can manage users based on their role and office"
    ON users FOR ALL
    USING (
        -- Может управлять собой (для обновления профиля)
        auth.uid()::uuid = id
        OR
        -- Или если есть права на управление
        check_user_permission(
            auth.uid()::uuid,
            'update',
            'users',
            office_id,
            id
        )
    )
    WITH CHECK (
        -- Может обновлять себя или если есть права
        auth.uid()::uuid = id
        OR
        check_user_permission(
            auth.uid()::uuid,
            'update',
            'users',
            office_id,
            id
        )
    );

-- Политики для дел
CREATE POLICY "Users can read cases based on their role and office"
    ON cases FOR SELECT
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'read',
            'cases',
            office_id,
            assigned_lawyer_id
        )
    );

CREATE POLICY "Users can manage cases based on their role and office"
    ON cases FOR ALL
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'update',
            'cases',
            office_id,
            assigned_lawyer_id
        )
    )
    WITH CHECK (
        check_user_permission(
            auth.uid()::uuid,
            'create',
            'cases',
            office_id,
            assigned_lawyer_id
        )
    );

-- Политики для офисов
CREATE POLICY "Users can read offices based on their role"
    ON offices FOR SELECT
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'read',
            'offices',
            id,
            NULL
        )
    );

CREATE POLICY "Users can manage offices based on their role"
    ON offices FOR ALL
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'update',
            'offices',
            id,
            NULL
        )
    )
    WITH CHECK (
        check_user_permission(
            auth.uid()::uuid,
            'create',
            'offices',
            id,
            NULL
        )
    );

-- Политики для приглашений
CREATE POLICY "Users can read invitations based on their role and office"
    ON invitations FOR SELECT
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'read',
            'invitations',
            office_id,
            NULL
        )
    );

CREATE POLICY "Users can manage invitations based on their role and office"
    ON invitations FOR ALL
    USING (
        check_user_permission(
            auth.uid()::uuid,
            'update',
            'invitations',
            office_id,
            NULL
        )
    )
    WITH CHECK (
        check_user_permission(
            auth.uid()::uuid,
            'create',
            'invitations',
            office_id,
            NULL
        )
    );

-- 9. Обновление таблицы дел для связи с офисами
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;

-- Заполняем office_id для существующих дел на основе assigned_lawyer_id
UPDATE cases
SET office_id = (
    SELECT office_id
    FROM users
    WHERE users.id = cases.assigned_lawyer_id
)
WHERE office_id IS NULL AND assigned_lawyer_id IS NOT NULL;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_cases_office ON cases(office_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_lawyer ON cases(assigned_lawyer_id);

-- 10. Обновление таблицы сообщений для поддержки офисов
-- Предполагаем, что у вас есть таблица telegram_messages
ALTER TABLE telegram_messages
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;

-- Если у вас есть связь сообщений с делами, обновляем office_id
UPDATE telegram_messages
SET office_id = (
    SELECT office_id
    FROM cases
    WHERE cases.id = telegram_messages.case_id
)
WHERE office_id IS NULL AND case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_messages_office ON telegram_messages(office_id);

-- 11. Функция для автоматического назначения офиса при создании пользователя
CREATE OR REPLACE FUNCTION assign_user_office()
RETURNS TRIGGER AS $
BEGIN
    -- Если это первый пользователь, делаем его админом
    IF (SELECT COUNT(*) FROM users) = 0 THEN
        NEW.role = 'admin';
    END IF;

    -- Если создается пользователь через приглашение, данные уже должны быть заполнены
    -- Эта функция просто для дополнительной проверки

    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Создаем триггер, если его нет
DROP TRIGGER IF EXISTS assign_user_office_trigger ON users;
CREATE TRIGGER assign_user_office_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_user_office();

-- 12. Функция для очистки истекших приглашений
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM invitations
    WHERE expires_at < NOW() - INTERVAL '1 day';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- 13. Создание представления для удобного просмотра приглашений
CREATE OR REPLACE VIEW invitation_details AS
SELECT
    i.id,
    i.email,
    i.role,
    i.token,
    i.expires_at,
    i.created_at,
    i.office_id,
    o.name as office_name,
    u.name as inviter_name,
    u.email as inviter_email,
    CASE
        WHEN i.expires_at < NOW() THEN 'expired'
        ELSE 'active'
    END as status
FROM invitations i
LEFT JOIN offices o ON i.office_id = o.id
LEFT JOIN users u ON i.invited_by = u.id;

-- 14. Создание представления для статистики офисов
CREATE OR REPLACE VIEW office_statistics AS
SELECT
    o.id,
    o.name,
    o.address,
    o.phone,
    o.email,
    o.created_at,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN u.role = 'lawyer' THEN 1 END) as lawyers_count,
    COUNT(CASE WHEN u.role = 'office_admin' THEN 1 END) as admins_count,
    COUNT(c.id) as total_cases,
    COUNT(CASE WHEN c.status = 'new' THEN 1 END) as new_cases,
    COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as active_cases,
    COUNT(CASE WHEN c.status = 'closed' THEN 1 END) as closed_cases,
    COUNT(i.id) as pending_invitations
FROM offices o
LEFT JOIN users u ON o.id = u.office_id
LEFT JOIN cases c ON o.id = c.office_id
LEFT JOIN invitations i ON o.id = i.office_id AND i.expires_at > NOW()
GROUP BY o.id, o.name, o.address, o.phone, o.email, o.created_at;

-- 15. Функция для миграции существующих данных
CREATE OR REPLACE FUNCTION migrate_existing_data()
RETURNS TEXT AS $
DECLARE
    result_text TEXT := '';
    default_office_id UUID;
    admin_count INTEGER;
BEGIN
    -- Создаем офис по умолчанию, если его нет
    SELECT id INTO default_office_id
    FROM offices
    WHERE name = 'Main Office'
    LIMIT 1;

    IF default_office_id IS NULL THEN
        INSERT INTO offices (name, address, phone, email)
        VALUES ('Main Office', '123 Legal Street, Law City', '+1-555-0123', 'info@legalfirm.com')
        RETURNING id INTO default_office_id;

        result_text := result_text || 'Created default office. ';
    END IF;

    -- Назначаем всех пользователей без офиса в офис по умолчанию
    UPDATE users
    SET office_id = default_office_id
    WHERE office_id IS NULL AND role IN ('office_admin', 'lawyer');

    result_text := result_text || 'Assigned users to default office. ';

    -- Проверяем, есть ли хотя бы один админ
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND is_active = true;

    IF admin_count = 0 THEN
        -- Делаем первого активного пользователя админом
        UPDATE users
        SET role = 'admin'
        WHERE is_active = true
        ORDER BY created_at
        LIMIT 1;

        result_text := result_text || 'Assigned admin role to first user. ';
    END IF;

    -- Обновляем office_id для дел
    UPDATE cases
    SET office_id = (
        SELECT office_id
        FROM users
        WHERE users.id = cases.assigned_lawyer_id
    )
    WHERE office_id IS NULL AND assigned_lawyer_id IS NOT NULL;

    result_text := result_text || 'Updated cases office assignments. ';

    RETURN result_text || 'Migration completed successfully.';
END;
$ LANGUAGE plpgsql;

-- 16. Настройка автоматической очистки (можно настроить как cron job)
-- Создаем функцию для периодического запуска
CREATE OR REPLACE FUNCTION scheduled_cleanup()
RETURNS TEXT AS $
DECLARE
    cleaned_invitations INTEGER;
    result_text TEXT := '';
BEGIN
    -- Очищаем истекшие приглашения
    SELECT cleanup_expired_invitations() INTO cleaned_invitations;
    result_text := result_text || 'Cleaned ' || cleaned_invitations || ' expired invitations. ';

    -- Здесь можно добавить другие задачи очистки

    RETURN result_text || 'Cleanup completed at ' || NOW();
END;
$ LANGUAGE plpgsql;

-- 17. Заключительные настройки и выполнение миграции
DO $
DECLARE
    migration_result TEXT;
BEGIN
    -- Выполняем миграцию существующих данных
    SELECT migrate_existing_data() INTO migration_result;
    RAISE NOTICE '%', migration_result;

    -- Включаем RLS для всех таблиц
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Row Level Security enabled for all tables.';

    -- Выводим статистику
    RAISE NOTICE 'Migration completed. Current statistics:';
    RAISE NOTICE 'Total users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Total offices: %', (SELECT COUNT(*) FROM offices);
    RAISE NOTICE 'Total cases: %', (SELECT COUNT(*) FROM cases);
    RAISE NOTICE 'Active invitations: %', (SELECT COUNT(*) FROM invitations WHERE expires_at > NOW());
END $;

-- 18. Создание полезных запросов для админки

-- Функция для получения полной информации о пользователе
CREATE OR REPLACE FUNCTION get_user_full_info(user_id UUID)
RETURNS JSON AS $
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user', json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'role', u.role,
            'is_active', u.is_active,
            'created_at', u.created_at,
            'last_login', u.last_login
        ),
        'office', json_build_object(
            'id', o.id,
            'name', o.name,
            'address', o.address
        ),
        'permissions', array_agg(
            json_build_object(
                'permission', rp.permission,
                'resource', rp.resource,
                'scope', rp.scope
            )
        ),
        'stats', json_build_object(
            'total_cases', COUNT(DISTINCT c.id),
            'active_cases', COUNT(DISTINCT CASE WHEN c.status IN ('new', 'in_progress') THEN c.id END),
            'closed_cases', COUNT(DISTINCT CASE WHEN c.status = 'closed' THEN c.id END)
        )
    ) INTO result
    FROM users u
    LEFT JOIN offices o ON u.office_id = o.id
    LEFT JOIN role_permissions rp ON rp.role = u.role
    LEFT JOIN cases c ON c.assigned_lawyer_id = u.id
    WHERE u.id = user_id
    GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login,
             o.id, o.name, o.address;

    RETURN result;
END;
$ LANGUAGE plpgsql;

-- Комментарии для документации
COMMENT ON TABLE role_permissions IS 'Права доступа для каждой роли пользователя';
COMMENT ON TABLE invitations IS 'Приглашения для новых пользователей с токенами';
COMMENT ON FUNCTION check_user_permission IS 'Проверка прав доступа пользователя к ресурсу';
COMMENT ON FUNCTION create_invitation_with_permissions IS 'Создание приглашения с проверкой прав';
COMMENT ON VIEW office_statistics IS 'Статистика по офисам включая пользователей и дела';
COMMENT ON VIEW invitation_details IS 'Детальная информация о приглашениях с именами офисов и приглашающих';

-- Вывод итоговой информации
SELECT
    'СИСТЕМА РОЛЕЙ НАСТРОЕНА УСПЕШНО' as status,
    'Роли: admin, office_admin, lawyer, client' as roles,
    'Права доступа настроены по офисам' as access_control,
    'RLS политики активированы' as security,
    'Система приглашений готова к работе' as invitations;