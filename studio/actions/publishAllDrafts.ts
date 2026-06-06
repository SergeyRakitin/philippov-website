import type {SanityClient} from '@sanity/client'
import {getPublishedId} from 'sanity'

export type DraftStub = {
  _id: string
  _type: string
}

const DRAFTS_FILTER = [
  '_id in path("drafts.**")',
  '!(_id in path("drafts.versions.**"))',
  '!(_type match "sanity.*")',
  '!(_type match "system.*")',
].join(' && ')

export async function fetchDraftSummary(
  client: SanityClient,
  candidateLimit = 50
): Promise<{total: number; candidates: DraftStub[]}> {
  const query = `{
    "total": count(*[${DRAFTS_FILTER}]),
    "candidates": *[${DRAFTS_FILTER}]|order(_updatedAt desc)[0...${candidateLimit}]{_id,_type}
  }`
  const result = await client.fetch<{total?: number; candidates?: DraftStub[]}>(query)
  return {
    total: Number(result?.total ?? 0),
    candidates: Array.isArray(result?.candidates) ? result.candidates : [],
  }
}

export async function fetchAllDraftStubs(client: SanityClient): Promise<DraftStub[]> {
  const query = `*[
    ${DRAFTS_FILTER}
  ]|order(_updatedAt desc){_id,_type}`
  const result = await client.fetch<DraftStub[]>(query)
  return Array.isArray(result) ? result : []
}

function toPublishedDoc(draft: Record<string, unknown>, publishedId: string): Record<string, unknown> {
  const type = draft._type
  if (typeof type !== 'string' || type.trim() === '') {
    throw new Error('Draft is missing _type')
  }

  const {_id, _rev, _createdAt, _updatedAt, ...rest} = draft as Record<string, unknown>
  return {
    ...rest,
    _id: publishedId,
    _type: type,
  }
}

async function publishSingleDraft(
  client: SanityClient,
  draftStub: DraftStub
): Promise<void> {
  const draftId = draftStub._id
  const publishedId = getPublishedId(draftId)

  const draft = (await client.getDocument(draftId)) as Record<string, unknown> | null
  if (!draft) {
    throw new Error('Draft document not found')
  }

  const publishedDoc = toPublishedDoc(draft, publishedId)

  await client
    .transaction()
    .createOrReplace(publishedDoc)
    .delete(draftId)
    .commit({tag: 'publish-all'})
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
  onSettled: (item: T, result: {ok: true} | {ok: false; error: unknown}) => void
): Promise<void> {
  const limit = Math.max(1, Math.floor(concurrency))
  let nextIndex = 0
  let inFlight = 0

  await new Promise<void>((resolve) => {
    const launch = () => {
      while (inFlight < limit && nextIndex < items.length) {
        const item = items[nextIndex]
        nextIndex += 1
        inFlight += 1
        handler(item)
          .then(() => onSettled(item, {ok: true}))
          .catch((error) => onSettled(item, {ok: false, error}))
          .finally(() => {
            inFlight -= 1
            if (nextIndex >= items.length && inFlight === 0) {
              resolve()
              return
            }
            launch()
          })
      }
    }

    launch()
  })
}

export async function publishAllDrafts(options: {
  client: SanityClient
  drafts: DraftStub[]
  concurrency?: number
  onProgress?: (progress: {processed: number; total: number; published: number; failed: number}) => void
}): Promise<{published: number; failed: number; errors: Array<{id: string; type: string; message: string}>}> {
  const {client, drafts, concurrency = 5, onProgress} = options
  const total = drafts.length

  let processed = 0
  let published = 0
  let failed = 0
  const errors: Array<{id: string; type: string; message: string}> = []

  const bump = () => {
    onProgress?.({processed, total, published, failed})
  }

  bump()

  await runWithConcurrency(
    drafts,
    concurrency,
    async (draftStub) => {
      await publishSingleDraft(client, draftStub)
    },
    (draftStub, result) => {
      processed += 1
      if (result.ok) {
        published += 1
      } else {
        failed += 1
        const message =
          result.error instanceof Error
            ? result.error.message
            : typeof result.error === 'string'
              ? result.error
              : 'Unknown error'
        errors.push({id: draftStub._id, type: draftStub._type, message})
      }
      bump()
    }
  )

  return {published, failed, errors}
}
