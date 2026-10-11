import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { VideoDropzone } from './VideoDropzone';
import { menuService } from '../../services/menuService';
import { AVAILABLE_LANGUAGES } from '../../context/LanguageContext';
import {
  X,
  Check,
  Sparkles,
  Globe,
  Plus,
  Flame,
  Scale,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const DishFormModal = ({
  restaurantId,
  categories = [],
  dishToEdit = null,
  initialCategoryId = null,
  supportedLocales = ['ru', 'tj', 'en'],
  onClose,
  onSaved
}) => {
  // Extract initial translations
  const initialNames = { ru: '', tj: '', en: '' };
  const initialDescs = { ru: '', tj: '', en: '' };
  const initialIngredients = { ru: '', tj: '', en: '' };
  const initialServings = { ru: '', tj: '', en: '' };

  if (dishToEdit?.name) {
    if (typeof dishToEdit.name === 'object') {
      Object.assign(initialNames, dishToEdit.name);
    } else {
      initialNames.ru = dishToEdit.name;
    }
  }

  if (dishToEdit?.description) {
    if (typeof dishToEdit.description === 'object') {
      Object.entries(dishToEdit.description).forEach(([lang, val]) => {
        if (typeof val === 'object' && val !== null) {
          initialDescs[lang] = val.description || val.text || '';
          initialIngredients[lang] = val.ingredients || '';
          initialServings[lang] = val.serving || '';
        } else if (typeof val === 'string') {
          initialDescs[lang] = val;
        }
      });
    } else if (typeof dishToEdit.description === 'string') {
      initialDescs.ru = dishToEdit.description;
    }
  }

  // Active languages for this dish (at least the restaurant's supported locales, or from existing dish)
  const existingKeys = [
    ...Object.keys(initialNames).filter((k) => initialNames[k]),
    ...supportedLocales
  ];
  const uniqueActiveLangs = Array.from(new Set(['ru', 'tj', 'en', ...existingKeys]));

  const [activeLangs, setActiveLangs] = useState(uniqueActiveLangs);
  const [selectedLang, setSelectedLang] = useState('ru');
  const [names, setNames] = useState(initialNames);
  const [descriptions, setDescriptions] = useState(initialDescs);
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [servings, setServings] = useState(initialServings);

  // Other fields
  const [price, setPrice] = useState(dishToEdit?.price !== undefined ? String(dishToEdit.price) : '');
  const [currency, setCurrency] = useState(dishToEdit?.currency || 'TJS');
  const [weightInfo, setWeightInfo] = useState(dishToEdit?.weight || '350 г');
  // CALORIES ARE EMPTY BY DEFAULT! Only filled if explicitly provided in existing dish!
  const [caloriesInfo, setCaloriesInfo] = useState(dishToEdit?.calories || '');
  const [allergens, setAllergens] = useState(
    dishToEdit?.allergens ? (Array.isArray(dishToEdit.allergens) ? dishToEdit.allergens.join(', ') : dishToEdit.allergens) : ''
  );
  const [categoryId, setCategoryId] = useState(
    dishToEdit?.category_id || initialCategoryId || categories[0]?.id || ''
  );
  const [mediaId, setMediaId] = useState(dishToEdit?.media?.id || null);
  const [isAvailable, setIsAvailable] = useState(dishToEdit ? dishToEdit.is_available : true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateSuccessMsg, setTranslateSuccessMsg] = useState(null);
  const [isAddLangOpen, setIsAddLangOpen] = useState(false);
  const [error, setError] = useState(null);

  // Available languages not yet added
  const remainingLangs = AVAILABLE_LANGUAGES.filter((l) => !activeLangs.includes(l.code));

  const handleAddLanguage = (langCode) => {
    if (!activeLangs.includes(langCode)) {
      setActiveLangs([...activeLangs, langCode]);
      setSelectedLang(langCode);
      setIsAddLangOpen(false);
    }
  };

  // One-click Auto-Translate magic function
  const handleAutoTranslate = async () => {
    const currentName = names[selectedLang]?.trim();
    const currentDesc = descriptions[selectedLang]?.trim();
    const currentIngr = ingredients[selectedLang]?.trim();
    const currentServ = servings[selectedLang]?.trim();

    if (!currentName && !currentDesc && !currentIngr && !currentServ) {
      setError(`Сначала заполните хотя бы одно поле на языке «${currentLangMeta.label}»`);
      return;
    }

    const targetLangs = activeLangs.filter((l) => l !== selectedLang);
    if (targetLangs.length === 0) {
      setError('Нет других активных языков для перевода');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setTranslateSuccessMsg(null);

    try {
      const res = await menuService.translateTexts({
        source_lang: selectedLang,
        target_langs: targetLangs,
        fields: {
          name: currentName || '',
          description: currentDesc || '',
          ingredients: currentIngr || '',
          serving: currentServ || ''
        }
      });

      const newNames = { ...names };
      const newDescs = { ...descriptions };
      const newIngrs = { ...ingredients };
      const newServs = { ...servings };

      targetLangs.forEach((tLang) => {
        const trans = res.translations?.[tLang];
        if (trans) {
          if (trans.name) newNames[tLang] = trans.name;
          if (trans.description) newDescs[tLang] = trans.description;
          if (trans.ingredients) newIngrs[tLang] = trans.ingredients;
          if (trans.serving) newServs[tLang] = trans.serving;
        }
      });

      setNames(newNames);
      setDescriptions(newDescs);
      setIngredients(newIngrs);
      setServings(newServs);
      setTranslateSuccessMsg(`✨ Успешно переведено на ${targetLangs.length} ${targetLangs.length === 1 ? 'язык' : 'языка'}!`);
      setTimeout(() => setTranslateSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Translation error:', err);
      setError('Ошибка автоперевода: ' + (err.message || 'Сервис перевода временно недоступен'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoryId) {
      setError('Пожалуйста, выберите раздел для блюда (сначала создайте раздел во вкладке «Управление разделами»)');
      return;
    }

    const mainName = names.ru || Object.values(names).find((n) => n?.trim());
    if (!mainName) {
      setError('Пожалуйста, введите название блюда хотя бы на одном языке');
      return;
    }

    if (!price || isNaN(parseFloat(price))) {
      setError('Пожалуйста, укажите корректную стоимость');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Clean empty translations
    const cleanNames = {};
    const cleanDescs = {};
    activeLangs.forEach((lang) => {
      if (names[lang]?.trim()) cleanNames[lang] = names[lang].trim();

      const d = descriptions[lang]?.trim() || '';
      const i = ingredients[lang]?.trim() || '';
      const s = servings[lang]?.trim() || '';

      if (d || i || s) {
        cleanDescs[lang] = {
          description: d,
          ingredients: i,
          serving: s
        };
      }
    });

    // Fallbacks for main languages
    if (!cleanNames.ru) cleanNames.ru = mainName;
    if (!cleanNames.en && cleanNames.ru) cleanNames.en = cleanNames.ru;
    if (!cleanNames.tj && cleanNames.ru) cleanNames.tj = cleanNames.ru;

    const parsedAllergens = allergens
      ? allergens.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      restaurant_id: restaurantId,
      category_id: parseInt(categoryId, 10),
      name_translations: cleanNames,
      description_translations: cleanDescs,
      price: parseFloat(price),
      currency: currency.trim() || 'TJS',
      weight_info: weightInfo.trim() || null,
      calories_info: caloriesInfo.trim() || null, // NULL IF EMPTY! No fake calories!
      allergens: parsedAllergens,
      media_id: mediaId,
      is_available: isAvailable
    };

    try {
      if (dishToEdit) {
        await menuService.updateDish(dishToEdit.id, payload);
      } else {
        await menuService.createDish(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLangMeta = AVAILABLE_LANGUAGES.find((l) => l.code === selectedLang) || {
    code: selectedLang,
    label: selectedLang.toUpperCase(),
    flag: '🌐'
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <GlassCard style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: 0 }}>
                {dishToEdit ? 'Редактировать блюдо' : 'Новое видео-блюдо'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                Заполните название и описание, прикрепите вертикальное видео и укажите характеристики.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          {translateSuccessMsg && (
            <div
              style={{
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: 'var(--accent-gold)',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} />
              <span>{translateSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Step 1: Video */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                1. Вертикальное видео блюда (Reels 9:16)
              </label>
              <VideoDropzone
                currentMediaId={mediaId}
                onMediaReady={(id) => setMediaId(id)}
              />
            </div>

            {/* Step 2: Multilingual Content */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  <Globe size={15} />
                  <span>2. Название и описание на разных языках</span>
                </label>

                {/* Magic Auto-Translate Button */}
                <button
                  type="button"
                  disabled={isTranslating}
                  onClick={handleAutoTranslate}
                  style={{
                    background: isTranslating ? 'rgba(212, 175, 55, 0.1)' : 'var(--accent-gold-gradient)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    color: isTranslating ? 'var(--accent-gold)' : '#09090b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: isTranslating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Перевести название и описание с текущего языка на все остальные языки"
                >
                  <Sparkles size={14} />
                  <span>{isTranslating ? 'Перевожу...' : '✨ Автоперевод на все языки'}</span>
                </button>
              </div>

              {/* Language Tabs Row */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                {activeLangs.map((langCode) => {
                  const meta = AVAILABLE_LANGUAGES.find((l) => l.code === langCode) || {
                    code: langCode,
                    label: langCode.toUpperCase(),
                    flag: '🌐'
                  };
                  const isSelected = selectedLang === langCode;
                  const isFilled = Boolean(
                    names[langCode]?.trim() ||
                    descriptions[langCode]?.trim() ||
                    ingredients[langCode]?.trim() ||
                    servings[langCode]?.trim()
                  );

                  return (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => setSelectedLang(langCode)}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#09090b' : 'var(--text-main)',
                        border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '7px 14px',
                        fontSize: '13px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{meta.flag}</span>
                      <span>{meta.label}</span>
                      {isFilled && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#09090b' : '#4ade80'
                          }}
                        />
                      )}
                    </button>
                  );
                })}

                {/* Add Language Dropdown Button */}
                {remainingLangs.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddLangOpen(!isAddLangOpen)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px dashed rgba(212, 175, 55, 0.4)',
                        color: 'var(--accent-gold)',
                        borderRadius: '10px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Язык</span>
                    </button>

                    {isAddLangOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '6px',
                          zIndex: 50,
                          backgroundColor: '#16161e',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          padding: '6px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '4px',
                          width: '280px',
                          maxHeight: '220px',
                          overflowY: 'auto'
                        }}
                      >
                        {remainingLangs.map((l) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => handleAddLanguage(l.code)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#fff',
                              padding: '8px 10px',
                              textAlign: 'left',
                              fontSize: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span>{l.flag}</span>
                            <span>{l.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Description for Active Language */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '600' }}>
                    Название блюда ({currentLangMeta.flag} {currentLangMeta.label}) *
                  </label>
                  <input
                    type="text"
                    required={selectedLang === 'ru'}
                    placeholder={`Например: ${selectedLang === 'en' ? 'Prime Ribeye Steak' : selectedLang === 'tj' ? 'Стейки Рибай' : 'Фирменный стейк Рибай'}`}
                    value={names[selectedLang] || ''}
                    onChange={(e) => setNames({ ...names, [selectedLang]: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 1. Short Description */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '600' }}>
                    <span>📝 Краткое описание блюда</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({currentLangMeta.flag} {currentLangMeta.label})</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Например: ${selectedLang === 'en' ? 'Tender New Zealand lamb rack in crispy pistachio crust' : selectedLang === 'tj' ? 'Караи барраи Зеландияи Нав дар қишри писта' : 'Нежное каре ягненка в хрустящей фисташковой корочке'}`}
                    value={descriptions[selectedLang] || ''}
                    onChange={(e) => setDescriptions({ ...descriptions, [selectedLang]: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 2. Ingredients / Composition */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '600' }}>
                    <span>🌿 Состав и ингредиенты</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({currentLangMeta.flag} {currentLangMeta.label})</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Например: ${selectedLang === 'en' ? 'Rack of lamb, pistachios, celery puree, rosemary, juniper berries' : selectedLang === 'tj' ? 'Гӯшти барра, писта, пюре аз карафс, розмарин, меваҳои арча' : 'Каре ягненка, фисташки, пюре из печеного сельдерея, розмарин, можжевеловые ягоды'}`}
                    value={ingredients[selectedLang] || ''}
                    onChange={(e) => setIngredients({ ...ingredients, [selectedLang]: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 3. Serving & Presentation */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '600' }}>
                    <span>🍽️ Особенности подачи и сервировка</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({currentLangMeta.flag} {currentLangMeta.label})</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Например: ${selectedLang === 'en' ? 'Served hot with signature juniper demi-glace sauce and fresh greens' : selectedLang === 'tj' ? 'Бо чошнии махсуси демиглас ва кабудии тоза гарм пешкаш мешавад' : 'Подается горячим с можжевеловым соусом демиглас и микрозеленью'}`}
                    value={servings[selectedLang] || ''}
                    onChange={(e) => setServings({ ...servings, [selectedLang]: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  💡 Совет: Заполните название и описание на одном удобном языке и нажмите кнопку <b>«✨ Автоперевод на все языки»</b> выше.
                </div>
              </div>
            </div>

            {/* Step 3: Category */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                3. Раздел меню (Категория) *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(10, 10, 14, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                {categories.length === 0 ? (
                  <option value="" disabled style={{ background: '#121218' }}>
                    Сначала создайте раздел во вкладке «Управление разделами»
                  </option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#121218' }}>
                      {c.name?.ru || c.name?.en || 'Раздел'} ({c.dishes?.length || 0} блюд)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Step 4: Price, Weight, Calories & Allergens */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                4. Стоимость и характеристики блюда
              </label>

              {/* Row 1: Price, Currency, Weight */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Стоимость *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Например: 120"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Валюта
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Выход / Вес порции
                  </label>
                  <input
                    type="text"
                    placeholder="напр. 350 г или 300 мл"
                    value={weightInfo}
                    onChange={(e) => setWeightInfo(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Calories (Explicitly Optional!) & Allergens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Flame size={12} style={{ color: '#f59e0b' }} />
                    <span>Калории (опционально)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Пусто (или напр. 580 ккал)"
                    value={caloriesInfo}
                    onChange={(e) => setCaloriesInfo(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'block' }}>
                    Оставьте пустым, чтобы не показывать калории
                  </span>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <AlertCircle size={12} style={{ color: '#f59e0b' }} />
                    <span>Аллергены (опционально)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="напр. орехи, лактоза, глютен"
                    value={allergens}
                    onChange={(e) => setAllergens(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 10, 14, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'block' }}>
                    Через запятую
                  </span>
                </div>
              </div>
            </div>

            {/* Availability Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
              <input
                type="checkbox"
                id="dish_is_available"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
              />
              <label htmlFor="dish_is_available" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer', fontWeight: '500' }}>
                Позиция доступна для заказа (не находится в стоп-листе)
              </label>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>

              <GoldButton type="submit" variant="primary" size="md" disabled={isSubmitting} icon={Check}>
                {isSubmitting ? 'Сохранение...' : dishToEdit ? 'Сохранить изменения' : 'Опубликовать позицию'}
              </GoldButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
