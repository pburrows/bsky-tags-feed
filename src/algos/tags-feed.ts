import { AppContext } from '../config'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { Subscriber } from '../db/schema'
import { InvalidRequestError } from '@atproto/xrpc-server'

export const shortname = 'tags-feed'
export const handler = async (ctx: AppContext, params: QueryParams, requester: string) => {
  try {
    const subscriberExists = await ctx.db
      .selectFrom('subscriber')
      .selectAll()
      .where('did', '==', requester)
      .execute()

    let subscriber: Subscriber

    if (subscriberExists.length === 0) {
      const newSubscriber: Subscriber = {
        did: requester,
        createdAt: (new Date()).toISOString(),
        lastSeen: (new Date()).toISOString(),
        followingTags: JSON.stringify(['psychology', 'physiology', '']),
      }
      await ctx.db.insertInto('subscriber')
        .values(newSubscriber)
        .onConflict(c => c.doNothing())
        .execute()
      subscriber = newSubscriber
    } else {
      subscriber = subscriberExists[0]
    }

    const tags: string[] = JSON.parse(subscriber.followingTags)

    if (!tags || tags.length === 0) {
      return null;
    }

    let builder = ctx.db
      .selectFrom('post')
      .selectAll()
      .where('tag', 'in', tags)
      .orderBy('indexedAt', 'desc')
      .orderBy('cid', 'desc')
      .limit(params.limit)

    if (params.cursor) {
      const [indexedAt, cid] = params.cursor.split('::')
      if (!indexedAt || !cid) {
        throw new InvalidRequestError('malformed cursor')
      }
      const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
      builder = builder
        .where('post.indexedAt', '<', timeStr)
        .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
        .where('post.cid', '<', cid)
    }

    const res = await builder.execute()
    const feed = res.map((row) => ({
      post: row.uri,
    }))

    let cursor: string | undefined
    const last = res.at(-1)
    if (last) {
      cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
    }

    return {
      cursor,
      feed,
    }
  } catch (err) {
    console.error(err)
  }
}
