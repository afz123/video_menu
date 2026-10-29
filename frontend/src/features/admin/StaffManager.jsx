import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  User,
  Crown
} from 'lucide-react';

const ROLES = [
  {
    id: 'manager',
    label: 'Управляющий (Manager)',
    badgeColor: '#eab308',
    icon: Crown,
    desc: 'Полный доступ к заведению, блюдам, персоналу и настройкам',
    defaultPermissions: ['view_menu', 'toggle_stop_list', 'edit_dish', 'manage_reservations', 'resolve_requests', 'manage_staff']
  },
  {
    id: 'hostess',
    label: 'Хостес (Hostess)',
    badgeColor: '#ec4899',
    icon: UserCheck,
    desc: 'Журнал броней, шахматка, рассадка гостей за столы и фото-карта',
    defaultPermissions: ['view_menu', 'manage_reservations', 'resolve_requests']
  },
  {
    id: 'waiter',
    label: 'Официант (Waiter)',
    badgeColor: '#38bdf8',
    icon: UtensilsCrossed,
    desc: 'Оперативный стоп-лист и закрытие вызовов / чеков гостей',
    defaultPermissions: ['view_menu', 'toggle_stop_list', 'resolve_requests']
  },
  {
    id: 'chef',
    label: 'Шеф-повар / Раздача (Chef)',
    badgeColor: '#f97316',
    icon: ChefHat,
    desc: 'Монитор раздачи кухни (KDS) и экстренная остановка блюд (стоп-лист)',
    defaultPermissions: ['view_menu', 'toggle_stop_list']
  }
];

const PERMISSION_OPTIONS = [
  {
    key: 'toggle_stop_list',
    label: 'Оперативный стоп-лист',
    desc: 'Возможность в 1 клик снять блюдо с продажи или вернуть его'
  },
  {
    key: 'resolve_requests',
    label: 'Обработка вызовов & счетов',
    desc: 'Закрытие вызовов официанта, кальяна, сомелье и запросов счета'
  },
  {
    key: 'manage_reservations',
    label: 'Управление бронями & залами',
    desc: 'Подтверждение броней, рассадка гостей и смена столов'
  },
  {
    key: 'edit_dish',
    label: 'Редактирование меню & цен',
    desc: 'Создание блюд, изменение цен, граммовок и состава'
  },
  {
    key: 'manage_staff',
    label: 'Управление персоналом',
    desc: 'Добавление новых сотрудников, выдача паролей и прав'
  }
];

export const StaffManager = ({ restaurantSlug }) => {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'waiter',
    permissions: ['view_menu', 'toggle_stop_list', 'resolve_requests'],
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState(null);

  const loadStaff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await menuService.getStaffMembers(restaurantSlug);
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки списка сотрудников');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [restaurantSlug]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'waiter',
      permissions: ['view_menu', 'toggle_stop_list', 'resolve_requests'],
      is_active: true
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role || 'waiter',
      permissions: user.permissions || [],
      is_active: user.is_active !== false
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole) => {
    const roleDef = ROLES.find((r) => r.id === newRole);
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: roleDef ? [...roleDef.defaultPermissions] : prev.permissions
    }));
  };

  const togglePermission = (permKey) => {
    setFormData((prev) => {
      const current = prev.permissions || [];
      if (current.includes(permKey)) {
        return { ...prev, permissions: current.filter((p) => p !== permKey) };
      } else {
        return { ...prev, permissions: [...current, permKey] };
      }
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.username.trim()) {
      setError('Укажите логин сотрудника');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setError('Укажите первоначальный пароль сотрудника');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingUser) {
        const updatePayload = {
          role: formData.role,
          permissions: formData.permissions,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }
        await menuService.updateStaffMember(editingUser.id, updatePayload);
        setSuccessMsg(`Данные сотрудника ${formData.username} успешно обновлены`);
      } else {
        await menuService.createStaffMember({
          username: formData.username.trim(),
          password: formData.password.trim(),
          role: formData.role,
          permissions: formData.permissions,
          restaurant_slug: restaurantSlug
        });
        setSuccessMsg(`Сотрудник ${formData.username} успешно добавлен`);
      }
      setIsModalOpen(false);
      await loadStaff();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Вы уверены, что хотите удалить сотрудника ${user.username}?`)) return;
    setDeletingId(user.id);
    try {
      await menuService.deleteStaffMember(user.id);
      setSuccessMsg(`Сотрудник ${user.username} удален`);
      await loadStaff();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка при удалении сотрудника');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <GlassCard style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)'
                }}
              >
                <Users size={20} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: '#fff', margin: 0, fontWeight: '600' }}>
                Сотрудники & Гранулярные Права (RBAC)
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, maxWidth: '650px', lineHeight: '1.5' }}>
              Создавайте индивидуальные учетные записи для официантов, хостес и поваров. Ограничивайте доступ к действиям
              (стоп-лист, редактирование цен, подтверждение броней, закрытие счетов).
            </p>
          </div>

          <GoldButton variant="primary" icon={UserPlus} onClick={handleOpenCreate}>
            Добавить сотрудника
          </GoldButton>
        </div>
      </GlassCard>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#4ade80',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Sparkles size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Role Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {ROLES.map((role) => {
          const Icon = role.icon;
          const count = staffList.filter((s) => s.role === role.id).length;
          return (
            <GlassCard key={role.id} style={{ padding: '20px', borderLeft: `3px solid ${role.badgeColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: role.badgeColor, fontWeight: '600', fontSize: '14px' }}>
                  <Icon size={18} />
                  <span>{role.label.split(' ')[0]}</span>
                </div>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: '600'
                  }}
                >
                  {count} чел.
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                {role.desc}
              </p>
            </GlassCard>
          );
        })}
      </div>

      {/* Staff Table */}
      <GlassCard style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', color: '#fff', margin: 0, fontWeight: '600' }}>
            Список персонала заведения ({staffList.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Персональный вход через форму авторизации
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Загрузка списка сотрудников...
          </div>
        ) : staffList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}
          >
            <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '6px' }}>
              Сотрудники еще не добавлены
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px' }}>
              Добавьте официантов, хостес или поваров, чтобы выдать им персональные логины и права.
            </p>
            <GoldButton variant="secondary" size="sm" icon={UserPlus} onClick={handleOpenCreate}>
              Создать первого сотрудника
            </GoldButton>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '600' }}>Логин / Имя</th>
                  <th style={{ padding: '12px 14px', fontWeight: '600' }}>Роль</th>
                  <th style={{ padding: '12px 14px', fontWeight: '600' }}>Разрешения (Permissions)</th>
                  <th style={{ padding: '12px 14px', fontWeight: '600' }}>Статус</th>
                  <th style={{ padding: '12px 14px', fontWeight: '600', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((user) => {
                  const roleDef = ROLES.find((r) => r.id === user.role) || {
                    label: user.role,
                    badgeColor: '#a1a1aa'
                  };
                  const perms = Array.isArray(user.permissions) ? user.permissions : [];
                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: '600'
                            }}
                          >
                            <User size={16} />
                          </div>
                          <div>
                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{user.username}</div>
                            {user.created_at && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                Создан: {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: `${roleDef.badgeColor}20`,
                            color: roleDef.badgeColor,
                            border: `1px solid ${roleDef.badgeColor}40`
                          }}
                        >
                          {roleDef.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '360px' }}>
                          {perms.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Нет прав</span>
                          ) : (
                            perms.map((p) => {
                              const pOpt = PERMISSION_OPTIONS.find((opt) => opt.key === p);
                              return (
                                <span
                                  key={p}
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    borderRadius: '6px',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    color: '#d4d4d8'
                                  }}
                                  title={pOpt?.desc || p}
                                >
                                  {pOpt ? pOpt.label : p}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: user.is_active !== false ? '#4ade80' : '#f87171'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: user.is_active !== false ? '#4ade80' : '#f87171'
                            }}
                          />
                          {user.is_active !== false ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#fff',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px'
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Изменить</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === user.id}
                            onClick={() => handleDelete(user)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>{deletingId === user.id ? '...' : 'Удалить'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal Add / Edit Staff */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div style={{ width: '100%', maxWidth: '540px' }}>
            <GlassCard style={{ padding: '32px', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Shield size={22} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#fff', margin: 0 }}>
                  {editingUser ? `Редактирование: ${editingUser.username}` : 'Новый сотрудник заведения'}
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 20px' }}>
                {editingUser
                  ? 'Измените роль, права доступа или задайте новый пароль сотрудника'
                  : 'Задайте логин, пароль и выберите должность сотрудника'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Username */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Логин сотрудника *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Например: waiter_alex или hostess_anna"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(15, 15, 20, 0.85)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {editingUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль для входа *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '•••••••• (без изменений)' : 'Минимум 4 символа'}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(15, 15, 20, 0.85)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        padding: '10px 40px 10px 14px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Role Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Должность / Роль
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {ROLES.map((r) => {
                      const isSelected = formData.role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleChange(r.id)}
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            textAlign: 'left',
                            background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)'}`,
                            color: isSelected ? 'var(--accent-gold)' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          <r.icon size={16} style={{ color: r.badgeColor }} />
                          <span>{r.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Гранулярные разрешения (Permissions)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {PERMISSION_OPTIONS.map((opt) => {
                      const isChecked = (formData.permissions || []).includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          onClick={() => togglePermission(opt.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: isChecked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isChecked ? 'rgba(212, 175, 55, 0.35)' : 'rgba(255,255,255,0.05)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              backgroundColor: isChecked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}
                          >
                            {isChecked && <Check size={14} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500' }}>{opt.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Toggle (if editing) */}
                {editingUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
                    <input
                      type="checkbox"
                      id="staff_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="staff_is_active" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                      Учетная запись активна (разрешить вход)
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <GoldButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                    Отмена
                  </GoldButton>
                  <GoldButton variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Сохранение...' : editingUser ? 'Сохранить изменения' : 'Создать сотрудника'}
                  </GoldButton>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

