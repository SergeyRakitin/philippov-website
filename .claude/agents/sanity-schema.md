<!-- Кто читает: Developer при работе с Sanity-схемами. Также прочитай: _shared.md -->

# Sanity Schema — субагент

Создание/изменение типа документа или object-типа в Sanity Studio. Следовать конвенциям проекта и `CONTRACT.md` (он — источник истины по именам полей).

## Перед началом

Прочитать `CONTRACT.md` — там зафиксированы все документы, поля, вложенные object-типы и GROQ-проекции. Любое изменение схемы синхронизируется с контрактом и фронтом одновременно.

## Шаги

### 1. Создать/изменить файл схемы

Путь: `studio/schemaTypes/{typeName}.ts`

Шаблон документа (по образцу `section.ts`):

```typescript
import {defineType, defineField} from 'sanity'

export default defineType({
  name: '{typeName}',
  title: '{Название на русском}',
  type: 'document',
  fields: [
    // Локализованные поля — через готовые object-типы (НЕ собирать {en,ru} вручную):
    defineField({
      name: 'title',
      title: 'Название',
      type: 'localeString',          // или localeText / localeRichText
      validation: (Rule) => Rule.required(),
    }),
    // ... остальные поля
  ],
  preview: {
    select: {title: 'title.en'},      // EN — источник, превью по EN
  },
})
```

Локализованные object-типы (определены в `studio/schemaTypes/locale.ts`):
- `localeString`  → `{ en: string, ru: string }`
- `localeText`    → `{ en: text,   ru: text }`
- `localeRichText`→ `{ en: block[], ru: block[] }` (Portable Text)

Вложенные object-типы проекта (в `studio/schemaTypes/objects.ts`): `videoItem`, `audioItem`, `socialLink`. Использовать их через `of: [{type: 'videoItem'}]`, не дублировать.

### 2. Зарегистрировать в index.ts

Файл: `studio/schemaTypes/index.ts`

1. Добавить import
2. Добавить в массив `schemaTypes`

### 3. Зарегистрировать в sanity.config.ts

Файл: `studio/sanity.config.ts`

Тип нужно добавить в структуру навигации Studio:
- **Обычный список документов:** `S.listItem().title('...').schemaType('{typeName}').child(S.documentTypeList('{typeName}').title('...'))`
- **Сортируемый список (orderable):** `orderableDocumentListDeskItem({ type: '{typeName}', ... })` (как `section`)
- **Singleton (одна запись):** `S.listItem().id('{typeName}').title('...').child(S.document().schemaType('{typeName}').documentId('{typeName}'))` (как `siteSettings`, `aboutSection`, `contactSettings`)

Без этого шага тип зарегистрирован в Sanity, но не появится в навигации Studio.

### 4. Обновить translatableTypes / singletons

Файл: `studio/constants/translatableTypes.ts`

- Если у типа есть локализованные поля — добавить его в `translatableTypes` (кнопка «Перевести» EN→RU работает по этому списку).
- Если тип singleton — добавить его `_id` в `singletonDocumentIds`.

### 5. Добавить GROQ-запрос (если нужен на сайте)

Файл: `src/lib/sanity.ts`

1. Добавить функцию/проекцию `get{TypeName}()`
2. Локализованные поля возвращать целиком как `{en, ru}` — локализация делается на фронте через `getLocalized`
3. Зеркалить проекцию из `CONTRACT.md`

### 6. Синхронизировать CONTRACT.md

Любое изменение полей/типов/проекций — отразить в `CONTRACT.md` в том же коммите.

## Конвенции

- Имена типов: camelCase (`section`, `aboutSection`, `videoItem`)
- Заголовки полей: на русском
- i18n: локализованные поля — только через `localeString`/`localeText`/`localeRichText`, источник EN
- preview: `select: {title: 'title.en'}` (EN — источник)
- Изображения: `type: 'image'`, `options: { hotspot: true }`
- Boolean-поля: всегда явный `initialValue: false` или `true`
- slug: `options: {source: 'title.en'}` — якорь строится из EN
