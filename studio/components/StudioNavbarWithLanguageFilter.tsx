import React, {useCallback, useEffect, useMemo, useState} from 'react'
import type {NavbarProps} from 'sanity'
import {getPublishedId, useClient, useDocumentOperation, useDocumentPairPermissions, useSchema} from 'sanity'
import {useRouterState} from 'sanity/router'
import {PublishIcon, TranslateIcon} from '@sanity/icons'
import {Box, Button, Card, Dialog, Flex, Spinner, Stack, Switch, Text, Tooltip} from '@sanity/ui'

import {runTranslation} from '../actions/translateAction'
import {fetchAllDraftStubs, fetchDraftSummary, publishAllDrafts, type DraftStub} from '../actions/publishAllDrafts'
import {translatableTypes, singletonDocumentIds} from '../constants/translatableTypes'
import {useLanguageVisibility} from './languageVisibility'

type CurrentDocument = {
  id: string
  type?: string
}

function extractDocumentIdFromSegment(segment: string): string | null {
  if (!segment) return null
  if (segment.includes('id=') && segment.includes('type=')) {
    const params = segment
      .split(';')
      .map((item) => item.split('='))
      .reduce<Record<string, string>>((acc, [key, value]) => {
        if (key && value) acc[key] = value
        return acc
      }, {})
    if (params.id) return decodeURIComponent(params.id)
  }

  const parts = segment.split(';').filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    if (!part || part.includes('=')) continue
    if (part.startsWith('drafts.')) return decodeURIComponent(part)
    const id = part.split(',')[0]
    if (id) return decodeURIComponent(id)
  }
  return null
}

function parseDocumentFromSegment(segment: string): CurrentDocument | null {
  if (!segment) return null
  if (segment.includes('id=') && segment.includes('type=')) {
    const params = segment
      .split(';')
      .map((item) => item.split('='))
      .reduce<Record<string, string>>((acc, [key, value]) => {
        if (key && value) acc[key] = value
        return acc
      }, {})
    if (params.id && params.type) {
      return {id: decodeURIComponent(params.id), type: decodeURIComponent(params.type)}
    }
  }
  return null
}

function getCurrentDocumentFromPath(pathname: string): CurrentDocument | null {
  if (!pathname) return null
  const parts = pathname.split('/').filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const segment = parts[i]
    if (!segment || !segment.includes(';')) continue
    const parsed = parseDocumentFromSegment(segment)
    if (parsed) return parsed
    const docId = extractDocumentIdFromSegment(segment)
    if (docId) return {id: docId}
  }

  const lastSegment = parts[parts.length - 1]
  if (lastSegment && singletonDocumentIds.includes(lastSegment)) {
    return {id: lastSegment, type: lastSegment}
  }
  return null
}

function parsePaneDescriptor(pane: unknown): CurrentDocument | null {
  if (typeof pane === 'string') {
    const parsed = parseDocumentFromSegment(pane)
    if (parsed) return parsed
    const docId = extractDocumentIdFromSegment(pane)
    if (docId) return {id: docId}
  } else if (pane && typeof pane === 'object') {
    const obj = pane as Record<string, unknown>
    const id = obj.id as string | undefined
    const params = obj.params as Record<string, unknown> | undefined
    const paramsDocId = params?.id as string | undefined
    if (paramsDocId && params?.type) return {id: paramsDocId, type: String(params.type)}
    if (id) {
      const parsed = parseDocumentFromSegment(String(id))
      if (parsed) return parsed
      const docId = extractDocumentIdFromSegment(String(id))
      if (docId) return {id: docId, type: (params?.type as string) || undefined}
    }
  }
  return null
}

function getCurrentDocumentFromRouterState(routerState: Record<string, unknown>): CurrentDocument | null {
  const state = (routerState?.structure as Record<string, unknown> | undefined) ?? routerState
  const panes = (state?.panes as unknown) ?? null
  if (Array.isArray(panes)) {
    for (let g = panes.length - 1; g >= 0; g -= 1) {
      const group = panes[g]
      const items = Array.isArray(group) ? group : [group]
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const result = parsePaneDescriptor(items[i])
        if (result) return result
      }
    }
  }

  const intent = state?.intent
  const params = state?.params as Record<string, unknown> | undefined
  if ((intent === 'edit' || intent === 'create') && params?.id && params?.type) {
    return {id: String(params.id), type: String(params.type)}
  }
  if (state?.id && state?.type) return {id: String(state.id), type: String(state.type)}
  return null
}

function TranslateTopbarButton(props: {doc: CurrentDocument}): JSX.Element | null {
  const {doc} = props
  const client = useClient({apiVersion: '2024-01-01'})
  const publishedId = getPublishedId(doc.id)
  const {patch} = useDocumentOperation(publishedId, doc.type!)
  const [isTranslating, setIsTranslating] = useState(false)

  const handleTranslate = useCallback(async () => {
    if (isTranslating) return
    await runTranslation({docId: doc.id, client, patch, setIsTranslating})
  }, [client, doc.id, isTranslating, patch])

  return (
    <Button
      mode="bleed"
      icon={TranslateIcon}
      text={isTranslating ? 'Перевод...' : 'Перевести'}
      disabled={isTranslating}
      onClick={handleTranslate}
    />
  )
}

function PublishAllTopbarButton(): JSX.Element {
  const client = useClient({apiVersion: '2024-01-01'})
  const schema = useSchema()

  const [draftSummary, setDraftSummary] = useState<{total: number; candidates: DraftStub[]}>({total: 0, candidates: []})
  const [isDraftSummaryLoading, setIsDraftSummaryLoading] = useState(true)
  const [draftSummaryError, setDraftSummaryError] = useState<string | null>(null)

  const [permissionCandidateIndex, setPermissionCandidateIndex] = useState(0)
  const [publishPermission, setPublishPermission] = useState<
    {status: 'unknown'} | {status: 'granted'} | {status: 'denied'; reason?: string}
  >({status: 'unknown'})
  const [lastDeniedReason, setLastDeniedReason] = useState<string | undefined>(undefined)

  const [dialogState, setDialogState] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle')
  const [runDrafts, setRunDrafts] = useState<DraftStub[]>([])
  const [progress, setProgress] = useState<{processed: number; total: number; published: number; failed: number}>({
    processed: 0,
    total: 0,
    published: 0,
    failed: 0,
  })
  const [runResult, setRunResult] = useState<{
    published: number
    failed: number
    errors: Array<{id: string; type: string; message: string}>
  } | null>(null)

  const validCandidates = useMemo(
    () => draftSummary.candidates.filter((c) => schema.get(c._type)),
    [draftSummary.candidates, schema],
  )
  const candidate = validCandidates[permissionCandidateIndex] ?? null
  const [candidatePermission, isCandidatePermissionLoading] = useDocumentPairPermissions({
    id: candidate ? getPublishedId(candidate._id) : 'siteSettings',
    type: candidate ? candidate._type : 'siteSettings',
    permission: 'publish',
  })

  const refreshSummary = useCallback(async () => {
    setIsDraftSummaryLoading(true)
    setDraftSummaryError(null)
    try {
      const summary = await fetchDraftSummary(client, 50)
      setDraftSummary(summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setDraftSummaryError(message)
      setDraftSummary({total: 0, candidates: []})
    } finally {
      setIsDraftSummaryLoading(false)
    }
  }, [client])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  useEffect(() => {
    const onFocus = () => {
      if (dialogState !== 'running') refreshSummary()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      return () => window.removeEventListener('focus', onFocus)
    }
    return undefined
  }, [dialogState, refreshSummary])

  useEffect(() => {
    setPermissionCandidateIndex(0)
    setPublishPermission({status: 'unknown'})
    setLastDeniedReason(undefined)
  }, [draftSummary.total, draftSummary.candidates])

  useEffect(() => {
    if (draftSummary.total === 0) return
    if (publishPermission.status === 'granted' || publishPermission.status === 'denied') return
    if (!candidate) {
      setPublishPermission({status: 'denied', reason: lastDeniedReason})
      return
    }
    if (isCandidatePermissionLoading) return
    if (!candidatePermission) return
    if (candidatePermission.granted) {
      setPublishPermission({status: 'granted'})
      return
    }
    setLastDeniedReason(candidatePermission.reason)
    setPermissionCandidateIndex((idx) => idx + 1)
  }, [
    candidate,
    candidatePermission,
    draftSummary.total,
    isCandidatePermissionLoading,
    lastDeniedReason,
    publishPermission.status,
  ])

  const canPublish = draftSummary.total > 0 && publishPermission.status === 'granted'
  const isRunning = dialogState === 'running'

  const disabledReason = useMemo(() => {
    if (draftSummaryError) return `Ошибка: ${draftSummaryError}`
    if (isDraftSummaryLoading) return 'Загрузка черновиков...'
    if (draftSummary.total === 0) return 'Нет черновиков'
    if (publishPermission.status === 'unknown') return 'Проверка прав...'
    if (publishPermission.status === 'denied') return 'Недостаточно прав для публикации'
    return null
  }, [draftSummaryError, draftSummary.total, isDraftSummaryLoading, publishPermission.status])

  const buttonText = useMemo(() => {
    if (!isRunning) return 'Publish all'
    const total = progress.total || runDrafts.length
    return `Publishing ${progress.processed}/${total}`
  }, [isRunning, progress.processed, progress.total, runDrafts.length])

  const handleOpenConfirm = useCallback(async () => {
    if (!canPublish || isRunning) return
    const drafts = await fetchAllDraftStubs(client)
    setRunDrafts(drafts)
    setRunResult(null)
    setProgress({processed: 0, total: drafts.length, published: 0, failed: 0})
    setDialogState('confirm')
  }, [canPublish, client, isRunning])

  const handleCancel = useCallback(() => {
    if (isRunning) return
    setDialogState('idle')
    setRunDrafts([])
    setRunResult(null)
  }, [isRunning])

  const handleConfirm = useCallback(async () => {
    if (isRunning) return
    const drafts = runDrafts.length > 0 ? runDrafts : await fetchAllDraftStubs(client)
    setRunDrafts(drafts)
    setProgress({processed: 0, total: drafts.length, published: 0, failed: 0})
    setDialogState('running')
    try {
      const result = await publishAllDrafts({
        client,
        drafts,
        concurrency: 5,
        onProgress: (p) => setProgress(p),
      })
      setRunResult(result)
      setDialogState('done')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setRunResult({published: 0, failed: drafts.length, errors: [{id: 'all', type: 'all', message}]})
      setDialogState('done')
    } finally {
      refreshSummary()
    }
  }, [client, isRunning, refreshSummary, runDrafts])

  const dialog = useMemo(() => {
    if (dialogState === 'idle') return null

    if (dialogState === 'confirm') {
      const total = runDrafts.length
      return (
        <Dialog
          id="publish-all-confirm"
          header="Опубликовать все черновики?"
          width={1}
          onClose={handleCancel}
          footer={
            <Box padding={3} paddingX={4}>
              <Flex gap={2} justify="flex-end">
                <Button mode="ghost" text="Отмена" onClick={handleCancel} />
                <Button
                  tone="primary"
                  text={total > 0 ? `Опубликовать (${total})` : 'Опубликовать'}
                  onClick={handleConfirm}
                  disabled={total === 0}
                />
              </Flex>
            </Box>
          }
        >
          <Box paddingX={4} paddingTop={4} paddingBottom={2}>
            <Stack space={4}>
              <Text size={1} muted>
                Опубликовать все черновики
              </Text>
              <Text size={1}>Будут опубликованы все черновики в датасете (кроме versions и системных типов).</Text>
              <Card padding={3} radius={2} tone="caution">
                <Stack space={2}>
                  <Text size={1}>
                    Количество: <b>{total}</b>
                  </Text>
                  <Text size={1} muted>
                    Это действие нельзя отменить.
                  </Text>
                </Stack>
              </Card>
            </Stack>
          </Box>
        </Dialog>
      )
    }

    if (dialogState === 'running') {
      const total = progress.total || runDrafts.length
      return (
        <Dialog
          id="publish-all-running"
          header="Публикация черновиков"
          width={1}
          onClose={() => {}}
          __unstable_hideCloseButton
          footer={
            <Box padding={3} paddingX={4}>
              <Flex gap={2} justify="flex-end">
                <Button mode="ghost" text="Закрыть" disabled />
              </Flex>
            </Box>
          }
        >
          <Box paddingX={4} paddingTop={4} paddingBottom={2}>
            <Stack space={4}>
              <Flex gap={3} align="center">
                <Spinner muted />
                <Text size={1}>
                  {progress.processed} / {total} (ok: {progress.published}, errors: {progress.failed})
                </Text>
              </Flex>
              <Card padding={3} radius={2} tone={progress.failed > 0 ? 'caution' : 'inherit'}>
                <Text size={1} muted>
                  Окно можно закрыть после завершения.
                </Text>
              </Card>
            </Stack>
          </Box>
        </Dialog>
      )
    }

    if (dialogState === 'done') {
      const published = runResult?.published ?? 0
      const failed = runResult?.failed ?? 0
      const total = (runDrafts.length || progress.total) ?? 0
      const hasErrors = Boolean(runResult?.errors?.length)
      return (
        <Dialog
          id="publish-all-done"
          header="Publish all — готово"
          width={1}
          onClose={handleCancel}
          footer={
            <Box padding={3} paddingX={4}>
              <Flex gap={2} justify="flex-end">
                <Button tone="primary" text="Закрыть" onClick={handleCancel} />
              </Flex>
            </Box>
          }
        >
          <Box paddingX={4} paddingTop={4} paddingBottom={2}>
            <Stack space={3}>
              <Text size={1}>
                Готово: опубликовано <b>{published}</b> из <b>{total}</b>. Ошибок: <b>{failed}</b>.
              </Text>
              {hasErrors ? (
                <Card padding={3} radius={2} tone="critical">
                  <Stack space={2}>
                    <Text size={1} weight="semibold">
                      Ошибки (первые 5)
                    </Text>
                    {runResult?.errors.slice(0, 5).map((err) => (
                      <Text key={`${err.id}:${err.type}`} size={1}>
                        {err.id} ({err.type}): {err.message}
                      </Text>
                    ))}
                  </Stack>
                </Card>
              ) : null}
            </Stack>
          </Box>
        </Dialog>
      )
    }

    return null
  }, [
    dialogState,
    handleCancel,
    handleConfirm,
    progress.failed,
    progress.processed,
    progress.published,
    progress.total,
    runDrafts.length,
    runResult?.errors,
    runResult?.failed,
    runResult?.published,
  ])

  return (
    <>
      <Tooltip
        content={disabledReason ? <Text size={1}>{disabledReason}</Text> : null}
        disabled={!disabledReason}
        placement="bottom"
      >
        <Box style={{display: 'inline-flex'}}>
          <Button
            mode="bleed"
            icon={PublishIcon}
            text={buttonText}
            disabled={!canPublish || isRunning}
            onClick={handleOpenConfirm}
          />
        </Box>
      </Tooltip>
      {dialog}
    </>
  )
}

export function StudioNavbarWithLanguageFilter(props: NavbarProps): JSX.Element {
  const {visibility, setVisibility} = useLanguageVisibility()
  const routerState = useRouterState()
  const client = useClient({apiVersion: '2024-01-01'})
  const [navbarRect, setNavbarRect] = useState<{top: number; left: number; width: number; height: number} | null>(null)
  const [searchRect, setSearchRect] = useState<{
    top: number
    left: number
    width: number
    height: number
    right: number
  } | null>(null)

  const toggle = (lang: 'en' | 'ru') => {
    setVisibility({...visibility, [lang]: !visibility[lang]})
  }

  const updateNavbarRect = useCallback(() => {
    if (typeof document === 'undefined') return
    const el = document.querySelector('[data-ui="Navbar"]') as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()
    setNavbarRect({top: rect.top, left: rect.left, width: rect.width, height: rect.height})
    const searchButton = document.querySelector('[data-testid="studio-search"]') as HTMLElement | null
    if (searchButton) {
      const srect = searchButton.getBoundingClientRect()
      setSearchRect({top: srect.top, left: srect.left, width: srect.width, height: srect.height, right: srect.right})
    }
  }, [])

  const currentDocument = useMemo(() => {
    if (typeof window === 'undefined') return null
    return (
      getCurrentDocumentFromRouterState(routerState) ?? getCurrentDocumentFromPath(window.location.pathname)
    )
  }, [routerState])

  const [resolvedDocument, setResolvedDocument] = useState<CurrentDocument | null>(null)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    if (!currentDocument?.id) {
      setResolvedDocument(null)
      return undefined
    }
    if (currentDocument.type) {
      setResolvedDocument(currentDocument)
      return undefined
    }

    const publishedId = currentDocument.id.startsWith('drafts.')
      ? currentDocument.id.replace(/^drafts\./, '')
      : currentDocument.id

    if (translatableTypes.includes(publishedId)) {
      setResolvedDocument({id: currentDocument.id, type: publishedId})
      return undefined
    }

    const idsToTry = [publishedId, `drafts.${publishedId}`]
    const tryResolve = (isRetry = false) => {
      Promise.all(idsToTry.map((id) => client.getDocument(id).catch(() => null)))
        .then((docs) => {
          if (cancelled) return
          const found = docs.find((d: any) => d?._type)
          if (found) {
            setResolvedDocument({id: currentDocument.id, type: String((found as any)._type)})
          } else if (!isRetry) {
            setResolvedDocument({id: currentDocument.id})
            retryTimer = setTimeout(() => tryResolve(true), 3000)
          } else {
            setResolvedDocument({id: currentDocument.id})
          }
        })
        .catch((error) => {
          console.warn('Failed to resolve document type for translate button:', error)
          if (!cancelled) setResolvedDocument({id: currentDocument.id})
        })
    }
    tryResolve()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [client, currentDocument?.id, currentDocument?.type])

  useEffect(() => {
    updateNavbarRect()
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return
    const el = document.querySelector('[data-ui="Navbar"]') as HTMLElement | null
    if (!el) return
    const observer = new ResizeObserver(() => updateNavbarRect())
    observer.observe(el)
    window.addEventListener('resize', updateNavbarRect)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateNavbarRect)
    }
  }, [updateNavbarRect])

  const actions = useMemo(
    () => [
      {
        name: 'publish-all-topbar',
        location: 'topbar' as const,
        render: () => <PublishAllTopbarButton />,
      },
      {
        name: 'language-visibility-topbar',
        location: 'topbar' as const,
        render: () => {
          if (!navbarRect) return <></>
          const left = searchRect ? searchRect.right + 12 : navbarRect.left + navbarRect.width / 2
          return (
            <Box
              style={{
                position: 'fixed',
                top: navbarRect.top,
                left,
                height: navbarRect.height,
                display: 'flex',
                alignItems: 'center',
                transform: searchRect ? 'none' : 'translateX(calc(-100% - 16px))',
                zIndex: 200,
                pointerEvents: 'auto',
              }}
            >
              <Flex gap={3} align="center">
                <Box style={{height: 20, width: 1, background: 'var(--card-border-color, #e4e8ef)'}} />
                <Text size={1} muted>
                  Отображать поля
                </Text>
                <Flex gap={2} align="center">
                  <Switch checked={visibility.en} onChange={() => toggle('en')} />
                  <Text size={1}>EN</Text>
                </Flex>
                <Flex gap={2} align="center">
                  <Switch checked={visibility.ru} onChange={() => toggle('ru')} />
                  <Text size={1}>RU</Text>
                </Flex>
                <Box style={{height: 20, width: 1, background: 'var(--card-border-color, #e4e8ef)'}} />
                {resolvedDocument?.id &&
                resolvedDocument.type &&
                translatableTypes.includes(resolvedDocument.type) ? (
                  <TranslateTopbarButton doc={resolvedDocument} />
                ) : (
                  <Button mode="bleed" icon={TranslateIcon} text="Перевести" disabled />
                )}
              </Flex>
            </Box>
          )
        },
      },
      ...(props.__internal_actions ?? []),
    ],
    [props.__internal_actions, visibility.en, visibility.ru, navbarRect, searchRect, currentDocument, resolvedDocument],
  )

  return props.renderDefault({...props, __internal_actions: actions})
}
